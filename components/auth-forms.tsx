"use client";

import { useActionState } from "react";
import {
  login,
  updatePassword,
  verifyLoginCode,
  type AuthState,
} from "@/app/actions/auth";
import { useI18n } from "@/components/i18n-provider";
import { Honeypot, TurnstileField } from "@/components/form-guards";

const initial: AuthState = {};

export function LoginForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(login, initial);
  const [codeState, codeAction, codePending] = useActionState(verifyLoginCode, initial);

  if (state.mfa && state.factorId) {
    return (
      <form className="auth-card" action={codeAction}>
        <p className="pixel">{t.auth.code}</p>
        <h1>{t.auth.codeTitle}</h1>
        <p className="muted">{t.auth.codeHint}</p>
        <input type="hidden" name="factorId" value={state.factorId} />
        <label htmlFor="code">{t.auth.code}</label>
        <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required />
        {codeState.error ? <p className="error" role="alert">{codeState.error}</p> : null}
        <button className="btn btn-ember" type="submit" disabled={codePending}>
          {codePending ? t.auth.checking : t.auth.continue}
        </button>
      </form>
    );
  }

  return (
    <form className="auth-card" action={action}>
      <p className="pixel">{t.auth.account}</p>
      <h1>{t.auth.login}</h1>
      <Honeypot />
      <label htmlFor="email">{t.auth.email}</label>
      <input id="email" name="email" type="email" autoComplete="username" required maxLength={254} />
      <label htmlFor="password">{t.auth.password}</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required minLength={12} maxLength={72} />
      <TurnstileField />
      {state.error ? <p className="error" role="alert">{state.error}</p> : null}
      <button className="btn btn-ember" type="submit" disabled={pending}>
        {pending ? t.auth.loggingIn : t.auth.loginButton}
      </button>
    </form>
  );
}

export function NewPasswordForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(updatePassword, initial);

  return (
    <form className="auth-card" action={action}>
      <p className="pixel">{t.auth.account}</p>
      <h1>{t.auth.newPassword}</h1>
      <label htmlFor="password">{t.auth.password}</label>
      <input id="password" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={72} />
      <p className="muted">{t.auth.rules}</p>
      {state.error ? <p className="error" role="alert">{state.error}</p> : null}
      <button className="btn btn-ember" type="submit" disabled={pending}>
        {pending ? t.auth.saving : t.auth.savePassword}
      </button>
    </form>
  );
}
