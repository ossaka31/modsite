import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AdminEditor } from "@/components/admin-editor";
import { MfaChallenge, MfaSetup } from "@/components/mfa-panel";
import { readSite } from "@/lib/content/schema";
import { galleryUrl } from "@/lib/content/load";
import type { CommentItem } from "@/lib/content/load";
import { getCurrentUser } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { text } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await text();
  return { title: copy.admin.title, robots: { index: false, follow: false } };
}

export default function Page() {
  return (
    <Suspense fallback={<p className="page-loading">Yükleniyor</p>}>
      <AdminScreen />
    </Suspense>
  );
}

async function AdminScreen() {
  const copy = await text();
  if (!hasSupabaseEnv()) {
    return (
      <main id="icerik" className="auth-page">
        <section className="auth-card">
          <h1>{copy.admin.setupTitle}</h1>
          <p className="muted">{copy.admin.setupBody}</p>
        </section>
      </main>
    );
  }

  const user = await getCurrentUser();
  if (!user) redirect("/giris");
  if (user.role !== "admin") {
    return (
      <main id="icerik" className="auth-page">
        <section className="auth-card">
          <h1>{copy.admin.deniedTitle}</h1>
          <p className="muted">{copy.admin.deniedBody}</p>
        </section>
      </main>
    );
  }

  const supabase = await createClient();
  const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const factors = await supabase.auth.mfa.listFactors();
  const factor = factors.data?.totp.find((item) => item.status === "verified");

  if (!factor || assurance.data?.nextLevel !== "aal2") {
    return (
      <main id="icerik" className="auth-page">
        <MfaSetup />
      </main>
    );
  }

  if (assurance.data.currentLevel !== "aal2") {
    return (
      <main id="icerik" className="auth-page">
        <MfaChallenge factorId={factor.id} next="/admin" />
      </main>
    );
  }

  const document = await supabase.from("site_document").select("content").eq("id", 1).maybeSingle();
  const galleryRows = await supabase
    .from("gallery_images")
    .select("id, path, alt, sort_order")
    .order("sort_order", { ascending: true });
  const auditRows = await supabase
    .from("audit_events")
    .select("id, action, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(12);
  const commentRows = await supabase
    .from("comments")
    .select("id, parent_id, author, body, created_at, badge_type, user_id")
    .order("created_at", { ascending: false })
    .limit(50);

  const gallery = (galleryRows.data ?? []).flatMap((row) => {
    const url = galleryUrl(row.path);
    if (!url) return [];
    return [
      {
        id: row.id,
        path: row.path,
        url,
        alt: row.alt,
        sortOrder: row.sort_order,
      },
    ];
  });

  const audit = (auditRows.data ?? []).map((row) => ({
    id: row.id,
    action: row.action,
    detail: row.detail,
    createdAt: new Date(row.created_at).toLocaleString("tr-TR"),
  }));

  const comments = (commentRows.data ?? []).map((row) => ({
    id: row.id,
    parentId: row.parent_id ?? null,
    author: row.author ?? "",
    body: row.body,
    createdAt: new Date(row.created_at).toLocaleString("tr-TR"),
    badgeType: (row.badge_type as "osaka" | "anonymous" | "random" | null) ?? null,
    userId: row.user_id ?? null,
    replies: [] as CommentItem[],
  }));

  return (
    <main id="icerik" className="page">
      <AdminEditor
        initialSite={readSite(document.data?.content ?? {})}
        gallery={gallery}
        audit={audit}
        comments={comments}
      />
    </main>
  );
}
