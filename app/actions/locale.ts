"use server";

import { cookies } from "next/headers";
import { assertSameOrigin } from "@/lib/security";

export async function setLocale(formData: FormData) {
  if (!(await assertSameOrigin())) return;
  const locale = formData.get("locale") === "en" ? "en" : "tr";
  const jar = await cookies();
  jar.set("locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });
}
