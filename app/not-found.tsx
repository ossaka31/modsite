"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <main id="icerik" className="auth-page">
      <section className="auth-card">
        <p className="pixel">404</p>
        <h1>{t.auth.noPage}</h1>
        <p className="auth-links">
          <Link href="/">{t.auth.home}</Link>
        </p>
      </section>
    </main>
  );
}
