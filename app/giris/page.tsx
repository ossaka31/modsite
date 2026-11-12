import type { Metadata } from "next";
import { LoginForm } from "@/components/auth-forms";
import { text } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await text();
  return { title: copy.auth.login, robots: { index: false, follow: false } };
}

export default function Page() {
  return (
    <main id="icerik" className="auth-page">
      <LoginForm />
    </main>
  );
}
