"use server";

import { updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { contentLimits } from "@/lib/content/limits";
import { rateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, cleanText, clientAddress, verifyTurnstile } from "@/lib/security";
import { text } from "@/lib/locale";
import { getCurrentUser } from "@/lib/auth";

export type CommentState = { ok?: boolean; error?: string };

export type CommentBadgeType = "osaka" | "anonymous" | "random" | null;

function honeypot(formData: FormData) {
  return String(formData.get("company") ?? "").trim().length > 0;
}

function generateRandomUsername(): string {
  const adjectives = ["Silent", "Swift", "Shadow", "Crimson", "Iron", "Wild", "Keen", "Bold", "Calm", "Deep"];
  const nouns = ["Wolf", "Fox", "Hawk", "Bear", "Eagle", "Shark", "Tiger", "Lynx", "Drake", "Raven"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 9999).toString().padStart(4, "0");
  return `${adj}${noun}${num}`;
}

/**
 * Yorumlar giriş istemez. Kimlik yerine yalnızca aynı kaynak kontrolü,
 * IP başına hız sınırı, gizli tuzak alan ve Turnstile kullanılır.
 * Admin kullanıcıları rozet seçebilir: 'osaka' | 'anonymous' | 'random'
 */
export async function postComment(_state: CommentState, formData: FormData): Promise<CommentState> {
  const copy = await text();
  const fail = (message: string): CommentState => ({ error: message });

  if (!(await assertSameOrigin())) return fail(copy.errors.origin);
  if (!hasSupabaseEnv()) return fail(copy.errors.noSupabase);

  const address = await clientAddress();
  if (!rateLimit(`comment:${address}`, 5, 10 * 60 * 1000).ok) return fail(copy.errors.busy);

  if (honeypot(formData)) return fail(copy.errors.commentFailed);
  if (!(await verifyTurnstile(String(formData.get("cf-turnstile-response") ?? "")))) {
    return fail(copy.errors.commentFailed);
  }

  const body = cleanText(String(formData.get("body") ?? ""));
  if (body.length < 2) return fail(copy.errors.commentShort);
  if (body.length > contentLimits.commentBody) return fail(copy.errors.commentLong);

  let author = cleanText(String(formData.get("author") ?? ""));
  if (author.length > contentLimits.commentAuthor) return fail(copy.errors.commentNameLong);

  const parentId = String(formData.get("parent_id") ?? "").trim() || null;
  if (parentId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parentId)) {
    return fail(copy.errors.commentFailed);
  }

  // Admin rozet seçimi
  const user = await getCurrentUser();
  let badgeType: CommentBadgeType = null;
  let userId: string | null = null;

  if (user?.role === "admin") {
    const rawBadge = String(formData.get("badge_type") ?? "").trim();
    if (rawBadge === "osaka" || rawBadge === "anonymous" || rawBadge === "random") {
      badgeType = rawBadge;
      userId = user.id;
      // Rozet türüne göre yazar adını ayarla
      if (badgeType === "osaka") {
        author = "OSAKA";
      } else if (badgeType === "anonymous") {
        author = "";
      } else if (badgeType === "random") {
        author = generateRandomUsername();
      }
    }
  }

  // Eğer admin değilse veya rozet seçilmemişse, author boşsa anonim
  if (!author) {
    author = "";
  }

  const supabase = await createClient();
  const { error } = await supabase.from("comments").insert({
    parent_id: parentId,
    author,
    body,
    user_id: userId,
    badge_type: badgeType,
  });
  if (error) return fail(copy.errors.commentFailed);

  updateTag("comments");
  return { ok: true };
}
