import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { NewPasswordForm } from "@/components/auth-forms";
import { getCurrentUser } from "@/lib/auth";
import { text } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await text();
  return { title: copy.auth.newPassword, robots: { index: false, follow: false } };
}

export default function Page() {
  return (
    <Suspense fallback={<p className="page-loading">Yükleniyor</p>}>
      <PasswordScreen />
    </Suspense>
  );
}

async function PasswordScreen() {
  const user = await getCurrentUser();
  if (!user) redirect("/giris");
  return (
    <main id="icerik" className="auth-page">
      <NewPasswordForm />
    </main>
  );
}
