"use client";

import Script from "next/script";

export function TurnstileField() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) return null;

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
      <div className="cf-turnstile" data-sitekey={siteKey} />
    </>
  );
}

export function Honeypot() {
  return (
    <div className="hp" aria-hidden="true">
      <label htmlFor="company">Şirket</label>
      <input id="company" name="company" tabIndex={-1} autoComplete="off" />
    </div>
  );
}
