import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { setLocale } from "@/app/actions/locale";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { messages, type Locale } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export async function Dock() {
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);
  return <DockBar user={user} locale={locale} />;
}

export function DockFallback() {
  return (
    <header className="dock" aria-hidden="true">
      <span className="brand">
        <img src="/mark.png" alt="" width={36} height={36} />
      </span>
    </header>
  );
}

function DockBar({ user, locale }: { user: CurrentUser | null; locale: Locale }) {
  const t = messages[locale];
  const other = locale === "tr" ? "en" : "tr";

  return (
    <header className="dock">
      <Link href="/" className="dock-brand" aria-label="OSAKA">
        <img src="/mark.png" alt="" width={36} height={36} />
        <span>OSAKA</span>
      </Link>
      <nav className="dock-nav" aria-label={t.nav.language}>
        <Link href="/#kurulum" className="dock-link">
          <InstallIcon />
          <span>{t.nav.install}</span>
        </Link>
        <Link href="/#indir" className="dock-link">
          <DownloadIcon />
          <span>{t.nav.download}</span>
        </Link>
        {user?.role === "admin" ? (
          <Link href="/admin" className="dock-link dock-desktop">
            <span>{t.nav.admin}</span>
          </Link>
        ) : null}
      </nav>
      <div className="dock-end">
        <form action={setLocale}>
          <input type="hidden" name="locale" value={other} />
          <button type="submit" className="locale-switch" aria-label={t.nav.language}>
            {locale === "tr" ? "EN" : "TR"}
          </button>
        </form>
        {user ? (
          <>
            <Link href="/hesap" className="dock-link">
              <AccountIcon />
              <span>{t.nav.account}</span>
            </Link>
            <form action={logout} className="dock-desktop">
              <button type="submit" className="btn btn-ghost btn-small">
                {t.nav.logout}
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/giris" className="dock-link">
              <AccountIcon />
              <span>{t.nav.login}</span>
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

function InstallIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 8h7V4H4v4zm9-4v4h7V4h-7zM4 20h7v-7H4v7zm9 0h7v-7h-7v7z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4v10m0 0 4-4m-4 4-4-4M5 19h14" />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19.2c1.4-2.6 3.6-3.8 6.5-3.8s5.1 1.2 6.5 3.8" />
    </svg>
  );
}
