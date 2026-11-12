"use server";

import { updateTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv, supabaseEnv } from "@/lib/supabase/env";
import { describeSiteIssues, siteSchema, type SiteContent } from "@/lib/content/schema";
import { contentLimits } from "@/lib/content/limits";
import {
  assertSameOrigin,
  cleanText,
  contentTypeFor,
  isSafeImageSrc,
  safeStoragePath,
  sniffImage,
} from "@/lib/security";
import { text } from "@/lib/locale";
import type { Messages } from "@/lib/i18n";

async function err(key: keyof Messages["errors"]) {
  return (await text()).errors[key];
}

type EditorContext = { supabase: SupabaseClient; userId: string };

async function requireEditor(): Promise<EditorContext | { error: string }> {
  if (!(await assertSameOrigin())) return { error: await err("origin") };
  if (!hasSupabaseEnv()) return { error: await err("noSupabase") };

  const supabase = await createClient();
  const user = await supabase.auth.getUser();
  if (!user.data.user) return { error: await err("noSession") };

  const profile = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.data.user.id)
    .maybeSingle();
  if (profile.data?.role !== "admin") return { error: await err("forbidden") };

  const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance.data?.nextLevel !== "aal2" || assurance.data.currentLevel !== "aal2") {
    return { error: await err("needMfa") };
  }

  return { supabase, userId: user.data.user.id };
}

async function audit(supabase: SupabaseClient, userId: string, action: string, detail: string) {
  await supabase.from("audit_events").insert({ actor: userId, action, detail });
}

function editorError(result: EditorContext | { error: string }): result is { error: string } {
  return "error" in result;
}

export async function saveSite(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const editor = await requireEditor();
  if (editorError(editor)) return { ok: false, error: editor.error };

  const parsed = siteSchema.safeParse(input);
  if (!parsed.success) {
    const reason = describeSiteIssues(input);
    return {
      ok: false,
      error: reason ? `${await err("invalidContent")} (${reason})` : await err("invalidContent"),
    };
  }
  if (parsed.data.heroPath && !safeStoragePath(parsed.data.heroPath)) {
    return { ok: false, error: await err("badCover") };
  }

  const { error } = await editor.supabase.from("site_document").upsert({
    id: 1,
    content: parsed.data,
    updated_at: new Date().toISOString(),
    updated_by: editor.userId,
  });
  if (error) return { ok: false, error: await err("saveFailed") };

  await audit(editor.supabase, editor.userId, "site.save", "Sayfa içeriği güncellendi");
  updateTag("site");
  return { ok: true };
}

async function readSiteRow(supabase: SupabaseClient): Promise<SiteContent | null> {
  const { data } = await supabase.from("site_document").select("content").eq("id", 1).maybeSingle();
  if (!data?.content) return null;
  const parsed = siteSchema.safeParse(data.content);
  return parsed.success ? parsed.data : null;
}

export async function uploadHero(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const stored = await storeImage(formData);
  if (!stored.ok) return stored;

  const editor = stored.editor;
  const current = (await readSiteRow(editor.supabase)) ?? null;
  const previous = current?.heroPath ?? "";
  const next = {
    ...(current ?? stored.fallback),
    heroImage: stored.url,
    heroPath: stored.path,
  };
  const parsed = siteSchema.safeParse(next);
  if (!parsed.success) return { ok: false, error: await err("coverFailed") };

  const { error } = await editor.supabase.from("site_document").upsert({
    id: 1,
    content: parsed.data,
    updated_at: new Date().toISOString(),
    updated_by: editor.userId,
  });
  if (error) return { ok: false, error: await err("coverFailed") };

  if (previous && previous !== stored.path && safeStoragePath(previous)) {
    await editor.supabase.storage.from("media").remove([previous]);
  }
  await audit(editor.supabase, editor.userId, "hero.upload", "Kapak görseli değişti");
  updateTag("site");
  return { ok: true };
}

export async function uploadAvatar(
  formData: FormData,
): Promise<{ ok: true; url: string; path: string } | { ok: false; error: string }> {
  const stored = await storeImage(formData);
  if (!stored.ok) return stored;

  const editor = stored.editor;
  const current = (await readSiteRow(editor.supabase)) ?? null;
  const previous = current?.publisherAvatarPath ?? "";
  const next = {
    ...(current ?? stored.fallback),
    publisherAvatar: stored.url,
    publisherAvatarPath: stored.path,
  };
  const parsed = siteSchema.safeParse(next);
  if (!parsed.success) return { ok: false, error: await err("avatarFailed") };

  const { error } = await editor.supabase.from("site_document").upsert({
    id: 1,
    content: parsed.data,
    updated_at: new Date().toISOString(),
    updated_by: editor.userId,
  });
  if (error) return { ok: false, error: await err("avatarFailed") };

  if (previous && previous !== stored.path && safeStoragePath(previous)) {
    await editor.supabase.storage.from("media").remove([previous]);
  }
  await audit(editor.supabase, editor.userId, "publisher.upload", "Yayıncı görseli değişti");
  updateTag("site");
  return { ok: true, url: stored.url, path: stored.path };
}

export async function uploadGallery(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const editor = await requireEditor();
  if (editorError(editor)) return { ok: false, error: editor.error };

  const count = await editor.supabase.from("gallery_images").select("id", { count: "exact", head: true });
  if ((count.count ?? 0) >= 24) return { ok: false, error: await err("tooManyImages") };

  const stored = await storeImage(formData, editor);
  if (!stored.ok) return stored;

  const alt = cleanText(String(formData.get("alt") ?? "")).slice(0, 140);
  const latest = await editor.supabase
    .from("gallery_images")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const sortOrder = ((latest.data?.[0]?.sort_order as number | undefined) ?? 0) + 1;

  const { error } = await editor.supabase.from("gallery_images").insert({
    path: stored.path,
    alt,
    sort_order: sortOrder,
  });
  if (error) {
    await editor.supabase.storage.from("media").remove([stored.path]);
    return { ok: false, error: await err("galleryFailed") };
  }

  await audit(editor.supabase, editor.userId, "gallery.upload", "Galeriye görsel eklendi");
  updateTag("site");
  return { ok: true };
}

/**
 * Depoya dosya koymadan, dışarıdaki bir görsel adresini galeriye ekler.
 * Böylece sınırlı olan ücretsiz depolama boşa harcanmaz.
 */
export async function addGalleryLink(
  url: string,
  alt: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const editor = await requireEditor();
  if (editorError(editor)) return { ok: false, error: editor.error };

  const address = cleanText(url);
  if (!address || address.length > contentLimits.imageSrc || !isSafeImageSrc(address)) {
    return { ok: false, error: await err("badImageUrl") };
  }

  const count = await editor.supabase.from("gallery_images").select("id", { count: "exact", head: true });
  if ((count.count ?? 0) >= 24) return { ok: false, error: await err("tooManyImages") };

  const latest = await editor.supabase
    .from("gallery_images")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const sortOrder = ((latest.data?.[0]?.sort_order as number | undefined) ?? 0) + 1;

  const { error } = await editor.supabase.from("gallery_images").insert({
    path: address,
    alt: cleanText(alt).slice(0, 140),
    sort_order: sortOrder,
  });
  if (error) return { ok: false, error: await err("galleryFailed") };

  await audit(editor.supabase, editor.userId, "gallery.link", "Galeriye bağlantı eklendi");
  updateTag("site");
  return { ok: true };
}

export async function updateGalleryAlt(
  id: string,
  alt: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const editor = await requireEditor();
  if (editorError(editor)) return { ok: false, error: editor.error };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: await err("missingImage") };

  const { error } = await editor.supabase
    .from("gallery_images")
    .update({ alt: cleanText(alt).slice(0, 140) })
    .eq("id", id);
  if (error) return { ok: false, error: await err("altFailed") };
  updateTag("site");
  return { ok: true };
}

export async function moveGallery(
  id: string,
  direction: -1 | 1,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const editor = await requireEditor();
  if (editorError(editor)) return { ok: false, error: editor.error };
  if (direction !== -1 && direction !== 1) return { ok: false, error: await err("badOrder") };

  const { data } = await editor.supabase
    .from("gallery_images")
    .select("id, sort_order")
    .order("sort_order", { ascending: true });
  const rows = data ?? [];
  const index = rows.findIndex((row) => row.id === id);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= rows.length) return { ok: true };

  const current = rows[index];
  const neighbor = rows[next];
  if (!current || !neighbor) return { ok: true };

  await editor.supabase.from("gallery_images").update({ sort_order: neighbor.sort_order }).eq("id", current.id);
  await editor.supabase.from("gallery_images").update({ sort_order: current.sort_order }).eq("id", neighbor.id);
  updateTag("site");
  return { ok: true };
}

export async function deleteGallery(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const editor = await requireEditor();
  if (editorError(editor)) return { ok: false, error: editor.error };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: await err("missingImage") };

  const { data } = await editor.supabase.from("gallery_images").select("path").eq("id", id).maybeSingle();
  const { error } = await editor.supabase.from("gallery_images").delete().eq("id", id);
  if (error) return { ok: false, error: await err("deleteFailed") };
  if (data?.path && safeStoragePath(data.path)) {
    await editor.supabase.storage.from("media").remove([data.path]);
  }
  await audit(editor.supabase, editor.userId, "gallery.delete", "Galeri görseli silindi");
  updateTag("site");
  return { ok: true };
}

/** Yorumlar onay beklemeden yayınlanır; tek geri dönüş yolu bu silme işlemidir. */
export async function deleteComment(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const editor = await requireEditor();
  if (editorError(editor)) return { ok: false, error: editor.error };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: await err("commentDeleteFailed") };

  const { error } = await editor.supabase.from("comments").delete().eq("id", id);
  if (error) return { ok: false, error: await err("commentDeleteFailed") };

  await audit(editor.supabase, editor.userId, "comment.delete", "Yorum silindi");
  updateTag("comments");
  return { ok: true };
}

async function storeImage(
  formData: FormData,
  existing?: EditorContext,
): Promise<
  | { ok: true; path: string; url: string; editor: EditorContext; fallback: SiteContent }
  | { ok: false; error: string }
> {
  const editor = existing ?? (await requireEditor());
  if (editorError(editor)) return { ok: false, error: editor.error };

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: await err("noFile") };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffImage(bytes);
  const declared =
    file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : null;
  if (!sniffed || sniffed !== declared) {
    return { ok: false, error: await err("badType") };
  }

  const path = `${crypto.randomUUID()}.${sniffed}`;
  const { error } = await editor.supabase.storage.from("media").upload(path, bytes, {
    contentType: contentTypeFor(sniffed),
    upsert: false,
  });
  if (error) return { ok: false, error: await err("uploadFailed") };

  const { url } = supabaseEnv();
  const { defaultSite } = await import("@/lib/content/schema");
  return {
    ok: true,
    path,
    url: `${url}/storage/v1/object/public/media/${path}`,
    editor,
    fallback: defaultSite,
  };
}
