"use client";

import { useActionState, useState } from "react";
import { confirmMfa, enrollMfa, verifyLoginCode, type AuthState } from "@/app/actions/auth";
import { useI18n } from "@/components/i18n-provider";

const initial: AuthState = {};

export function MfaChallenge({ factorId, next = "/hesap" }: { factorId: string; next?: "/hesap" | "/admin" }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(verifyLoginCode, initial);

  return (
    <form className="auth-card" action={action}>
      <p className="pixel">{t.auth.code}</p>
      <h1>{t.auth.needCode}</h1>
      <p className="muted">{t.auth.needCodeHint}</p>
      <input type="hidden" name="factorId" value={factorId} />
      <input type="hidden" name="next" value={next} />
      <label htmlFor="code">{t.auth.code}</label>
      <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required />
      {state.error ? <p className="error" role="alert">{state.error}</p> : null}
      <button className="btn btn-ember" type="submit" disabled={pending}>
        {pending ? t.auth.checking : t.auth.verify}
      </button>
    </form>
  );
}

export function MfaSetup() {
  const { t } = useI18n();
  const [enroll, setEnroll] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [state, action, confirming] = useActionState(confirmMfa, initial);

  async function start() {
    setPending(true);
    setError(null);
    const result = await enrollMfa();
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEnroll(result);
  }

  return (
    <section className="auth-card">
      <p className="pixel">{t.auth.lock}</p>
      <h1>{t.auth.mfaTitle}</h1>
      <p className="muted">{t.auth.mfaBody}</p>
      {error ? <p className="error" role="alert">{error}</p> : null}
      {!enroll ? (
        <button className="btn btn-ember" type="button" onClick={start} disabled={pending}>
          {pending ? t.auth.preparing : t.auth.startMfa}
        </button>
      ) : (
        <form action={action}>
          <img className="qr" src={enroll.qr} alt={t.auth.qrAlt} />
          <p className="muted">
            {t.auth.manualKey} <code>{enroll.secret}</code>
          </p>
          <input type="hidden" name="factorId" value={enroll.factorId} />
          <label htmlFor="code">{t.auth.firstCode}</label>
          <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required />
          {state.error ? <p className="error" role="alert">{state.error}</p> : null}
          <button className="btn btn-ember" type="submit" disabled={confirming}>
            {confirming ? t.auth.checking : t.auth.finishMfa}
          </button>
        </form>
      )}
    </section>
  );
}
