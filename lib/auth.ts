import "server-only";

import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export type CurrentUser = {
  id: string;
  email: string;
  role: "admin" | "user";
  profileMissing: boolean;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!hasSupabaseEnv()) return null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;

    const profile = await supabase
      .from("profiles")
      .select("role, email")
      .eq("id", data.user.id)
      .maybeSingle();

    return {
      id: data.user.id,
      email: data.user.email ?? profile.data?.email ?? "",
      role: profile.data?.role === "admin" ? "admin" : "user",
      profileMissing: !profile.data,
    };
  } catch {
    return null;
  }
}
