import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { MfaChallenge, MfaSetup } from "@/components/mfa-panel";
import { logout } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { text } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await text();
  return { title: copy.auth.account, robots: { index: false, follow: false } };
}

export default function Page() {
  return (
    <Suspense fallback={<p className="page-loading">Yükleniyor</p>}>
      <AccountScreen />
    </Suspense>
  );
}

async function AccountScreen() {
  await connection();
  const copy = await text();
  if (!hasSupabaseEnv()) {
    return (
      <main id="icerik" className="auth-page">
        <section className="auth-card">
          <h1>{copy.auth.supabaseMissing}</h1>
          <p className="muted">{copy.auth.supabaseHint}</p>
        </section>
      </main>
    );
  }

  const user = await getCurrentUser();
  if (!user) redirect("/giris");

  const supabase = await createClient();
  const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const factors = await supabase.auth.mfa.listFactors();
  const factor = factors.data?.totp.find((item) => item.status === "verified");
  const needsCode = assurance.data?.nextLevel === "aal2" && assurance.data.currentLevel !== "aal2";

  return (
    <main id="icerik" className="auth-page">
      <section className="auth-card">
        <p className="pixel">{copy.auth.account}</p>
        <h1>{user.email}</h1>
        <p className="muted">{user.role === "admin" ? copy.auth.adminRole : copy.auth.memberRole}</p>
        {user.profileMissing ? (
          <p className="error">{copy.auth.profileMissing}</p>
        ) : null}
        {user.role === "admin" ? (
          <div className="admin-cta">
            <div>
              <strong>{copy.auth.adminPanel}</strong>
              <p className="muted">{copy.auth.adminPanelHint}</p>
            </div>
            <Link href="/admin" className="btn btn-ember">
              {copy.auth.openAdmin}
            </Link>
          </div>
        ) : (
          <p className="muted">{copy.auth.notAdmin}</p>
        )}
        <form action={logout}>
          <button type="submit" className="btn btn-ghost btn-small">
            {copy.nav.logout}
          </button>
        </form>
      </section>
      {needsCode && factor ? <MfaChallenge factorId={factor.id} /> : null}
      {!factor ? <MfaSetup /> : <p className="center-note">{copy.auth.mfaOn}</p>}
    </main>
  );
}
