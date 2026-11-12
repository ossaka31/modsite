import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import { Mark } from "@/components/mark";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <Mark className="brand-mark" />
        <span>OSAKA</span>
      </Link>
      <nav className="nav" aria-label="Sayfa">
        <Link href="/#kurulum">Kurulum</Link>
        <Link href="/#indir">İndir</Link>
        {user?.role === "admin" ? <Link href="/admin">Yönetim</Link> : null}
      </nav>
      <div className="header-actions">
        {user ? (
          <>
            <Link href="/hesap">Hesap</Link>
            <form action={logout}>
              <button type="submit" className="btn btn-ghost btn-small">
                Çıkış
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/giris">Giriş</Link>
          </>
        )}
      </div>
    </header>
  );
}

export function HeaderFallback() {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <Mark className="brand-mark" />
        <span>OSAKA</span>
      </Link>
    </header>
  );
}
