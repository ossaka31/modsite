import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { defaultSite, readSite, type SiteContent } from "@/lib/content/schema";
import { contentLimits } from "@/lib/content/limits";
import type { GalleryImage, CommentItem } from "@/lib/content/types";
import { hasSupabaseEnv, supabaseEnv } from "@/lib/supabase/env";
import { safeStoragePath } from "@/lib/security";
import { isSafeImageSrc } from "@/lib/urls";

export type { GalleryImage, CommentItem };

export type HomeData = {
  site: SiteContent;
  gallery: GalleryImage[];
};

/** Sayfada en yeni kaç yorum gösterilir. */
const COMMENTS_SHOWN = 100;

function publicImageUrl(path: string) {
  const { url } = supabaseEnv();
  return `${url}/storage/v1/object/public/media/${path}`;
}

/**
 * Galeri satırı ya depodaki bir dosyayı ya da dışarıdan verilmiş bir adresi
 * taşır. İkisi de kabul edilir; depoda yer kaplamayan bağlantılar bu yüzden
 * yüklemeye gerek kalmaz.
 */
export function galleryUrl(path: string): string | null {
  if (safeStoragePath(path)) return publicImageUrl(path);
  if (isSafeImageSrc(path)) return path;
  return null;
}

async function restGet(path: string) {
  const { url, key } = supabaseEnv();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return response.json() as Promise<unknown>;
}

function buildCommentTree(rows: CommentItem[]): CommentItem[] {
  const map = new Map<string, CommentItem>();
  const roots: CommentItem[] = [];

  for (const row of rows) {
    map.set(row.id, { ...row, replies: [] });
  }

  for (const row of rows) {
    const node = map.get(row.id)!;
    if (row.parentId) {
      const parent = map.get(row.parentId);
      if (parent) {
        parent.replies.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  const sortByDate = (a: CommentItem, b: CommentItem) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

  const sortTree = (comments: CommentItem[]) => {
    comments.sort(sortByDate);
    for (const comment of comments) {
      sortTree(comment.replies);
    }
  };

  sortTree(roots);
  return roots;
}

export async function getHomeData(): Promise<HomeData> {
  "use cache";
  cacheTag("site");
  cacheLife("hours");

  if (!hasSupabaseEnv()) {
    return { site: defaultSite, gallery: [] };
  }

  try {
    const [documentRows, galleryRows] = await Promise.all([
      restGet("site_document?id=eq.1&select=content"),
      restGet("gallery_images?select=id,path,alt,sort_order&order=sort_order.asc"),
    ]);

    const content = Array.isArray(documentRows)
      ? (documentRows[0] as { content?: unknown } | undefined)?.content
      : undefined;
    const site = content ? readSite(content) : defaultSite;

    const gallery = Array.isArray(galleryRows)
      ? galleryRows.flatMap((row) => {
          const item = row as {
            id?: string;
            path?: string;
            alt?: string;
            sort_order?: number;
          };
          if (!item.id || !item.path) return [];
          const url = galleryUrl(item.path);
          if (!url) return [];
          return [
            {
              id: item.id,
              path: item.path,
              url,
              alt: (item.alt ?? "").slice(0, 140),
              sortOrder: item.sort_order ?? 0,
            },
          ];
        })
      : [];

    return { site, gallery };
  } catch {
    return { site: defaultSite, gallery: [] };
  }
}

export async function getComments(): Promise<CommentItem[]> {
  "use cache";
  cacheTag("comments");
  cacheLife("minutes");

  if (!hasSupabaseEnv()) return [];

  try {
    const rows = await restGet(
      `comments?select=id,parent_id,author,body,created_at,badge_type,user_id&published=is.true&order=created_at.asc&limit=${COMMENTS_SHOWN}`,
    );
    if (!Array.isArray(rows)) return [];

    const flatComments = rows.flatMap((row) => {
      const item = row as {
        id?: string;
        parent_id?: string | null;
        author?: string;
        body?: string;
        created_at?: string;
        badge_type?: string | null;
        user_id?: string | null;
      };
      if (!item.id || typeof item.body !== "string") return [];
      return [
        {
          id: item.id,
          parentId: item.parent_id ?? null,
          author: (item.author ?? "").slice(0, contentLimits.commentAuthor),
          body: item.body.slice(0, contentLimits.commentBody),
          createdAt: item.created_at ?? "",
          badgeType: (item.badge_type as CommentItem["badgeType"]) ?? null,
          userId: item.user_id ?? null,
          replies: [] as CommentItem[],
        },
      ];
    });

    return buildCommentTree(flatComments);
  } catch {
    return [];
  }
}
