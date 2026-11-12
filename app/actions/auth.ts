"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { rateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, clientAddress, verifyTurnstile } from "@/lib/security";
import { codeSchema, emailSchema, passwordSchema } from "@/lib/content/schema";
import { text } from "@/lib/locale";

export type AuthState = {
  error?: string;
  message?: string;
  mfa?: boolean;
  factorId?: string;
};

function honeypot(formData: FormData) {
  return String(formData.get("company") ?? "").trim().length > 0;
}

async function err<K extends "loginFailed" | "origin" | "busy" | "noSupabase" | "badCode" | "codeFailed" | "registerFailed" | "badEmail" | "passwordRules" | "passwordNotEmail" | "signupMaybe" | "signupConfirm" | "resetSent" | "linkExpired" | "passwordUnchanged" | "signInFirst" | "mfaExists" | "mfaFailed">(
  key: K,
) {
  return (await text()).errors[key];
}

async function guard(bucket: string, limit: number, windowMs: number) {
  if (!(await assertSameOrigin())) return await err("origin");
  if (!hasSupabaseEnv()) return await err("noSupabase");
  const address = await clientAddress();
  const limited = rateLimit(`${bucket}:${address}`, limit, windowMs);
  if (!limited.ok) return await err("busy");
  return null;
}

async function captchaOk(formData: FormData) {
  return verifyTurnstile(String(formData.get("cf-turnstile-response") ?? ""));
}

export async function login(_state: AuthState, formData: FormData): Promise<AuthState> {
  const blocked = await guard("login", 8, 10 * 60 * 1000);
  if (blocked) return { error: blocked };
  if (honeypot(formData)) return { error: await err("loginFailed") };
  if (!(await captchaOk(formData))) return { error: await err("loginFailed") };

  const email = emailSchema.safeParse(formData.get("email"));
  const password = zPassword(formData.get("password"));
  if (!email.success || !password) return { error: await err("loginFailed") };

  const limited = rateLimit(`login-email:${email.data.toLowerCase()}`, 8, 10 * 60 * 1000);
  if (!limited.ok) return { error: await err("busy") };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.data,
    password,
  });
  if (error) return { error: await err("loginFailed") };

  const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance.data?.nextLevel === "aal2" && assurance.data.currentLevel !== "aal2") {
    const factors = await supabase.auth.mfa.listFactors();
    const factor = factors.data?.totp.find((item) => item.status === "verified");
    if (factor) return { mfa: true, factorId: factor.id };
  }

  redirect("/hesap");
}

export async function verifyLoginCode(_state: AuthState, formData: FormData): Promise<AuthState> {
  const blocked = await guard("mfa", 8, 10 * 60 * 1000);
  if (blocked) return { error: blocked, mfa: true, factorId: String(formData.get("factorId") ?? "") };

  const code = codeSchema.safeParse(formData.get("code"));
  const factorId = String(formData.get("factorId") ?? "");
  if (!code.success || !/^[0-9a-f-]{36}$/i.test(factorId)) {
    return { error: await err("badCode"), mfa: true, factorId };
  }

  const supabase = await createClient();
  const factors = await supabase.auth.mfa.listFactors();
  const ownsFactor = factors.data?.totp.some(
    (item) => item.id === factorId && item.status === "verified",
  );
  if (!ownsFactor) return { error: await err("loginFailed") };

  const challenge = await supabase.auth.mfa.challenge({ factorId });
  if (challenge.error || !challenge.data) return { error: await err("codeFailed"), mfa: true, factorId };

  const verified = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code: code.data,
  });
  if (verified.error) return { error: await err("codeFailed"), mfa: true, factorId };

  redirect(formData.get("next") === "/admin" ? "/admin" : "/hesap");
}

export async function updatePassword(_state: AuthState, formData: FormData): Promise<AuthState> {
  const blocked = await guard("password", 8, 30 * 60 * 1000);
  if (blocked) return { error: blocked };

  const password = passwordSchema.safeParse(formData.get("password"));
  if (!password.success) return { error: await err("passwordRules") };

  const supabase = await createClient();
  const user = await supabase.auth.getUser();
  if (!user.data.user) return { error: await err("linkExpired") };

  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) return { error: await err("passwordUnchanged") };
  redirect("/hesap");
}

export async function logout() {
  if (!(await assertSameOrigin())) return;
  if (!hasSupabaseEnv()) redirect("/");
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/");
}

export async function checkAdmin(): Promise<{ isAdmin: boolean }> {
  if (!hasSupabaseEnv()) return { isAdmin: false };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { isAdmin: false };
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  
  return { isAdmin: profile?.role === "admin" };
}

export async function enrollMfa(): Promise<
  { ok: true; factorId: string; qr: string; secret: string } | { ok: false; error: string }
> {
  if (!(await assertSameOrigin()) || !hasSupabaseEnv()) {
    return { ok: false, error: await err("origin") };
  }
  const supabase = await createClient();
  const user = await supabase.auth.getUser();
  if (!user.data.user) return { ok: false, error: await err("signInFirst") };

  const existing = await supabase.auth.mfa.listFactors();
  const verified = existing.data?.totp.find((item) => item.status === "verified");
  if (verified) return { ok: false, error: await err("mfaExists") };

  for (const factor of existing.data?.totp ?? []) {
    if (factor.status !== "verified") {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
  }

  const enrolled = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "OSAKA",
  });
  if (enrolled.error || !enrolled.data?.totp) {
    return { ok: false, error: await err("mfaFailed") };
  }

  return {
    ok: true,
    factorId: enrolled.data.id,
    qr: enrolled.data.totp.qr_code,
    secret: enrolled.data.totp.secret,
  };
}

export async function confirmMfa(_state: AuthState, formData: FormData): Promise<AuthState> {
  const blocked = await guard("mfa-enroll", 8, 10 * 60 * 1000);
  if (blocked) return { error: blocked };

  const code = codeSchema.safeParse(formData.get("code"));
  const factorId = String(formData.get("factorId") ?? "");
  if (!code.success || !/^[0-9a-f-]{36}$/i.test(factorId)) return { error: await err("badCode") };

  const supabase = await createClient();
  const challenge = await supabase.auth.mfa.challenge({ factorId });
  if (challenge.error || !challenge.data) return { error: await err("codeFailed") };

  const verified = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code: code.data,
  });
  if (verified.error) return { error: await err("codeFailed") };
  redirect("/hesap");
}

function zPassword(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  if (value.length < 12 || value.length > 72) return null;
  return value;
}
