"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { postComment, type CommentState } from "@/app/actions/comments";
import { checkAdmin } from "@/app/actions/auth";
import { contentLimits } from "@/lib/content/limits";
import { useI18n } from "@/components/i18n-provider";
import { Honeypot, TurnstileField } from "@/components/form-guards";

const initial: CommentState = {};

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function WarningIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

const BADGE_OPTIONS = [
  { value: "osaka", labelKey: "badgeOsaka", className: "badge-osaka", icon: <BadgeIconOsaka /> },
  { value: "anonymous", labelKey: "badgeAnonymous", className: "badge-anon", icon: <BadgeIconAnon /> },
  { value: "random", labelKey: "badgeRandom", className: "badge-random", icon: <BadgeIconRandom /> },
  { value: "", labelKey: "commentName", className: "badge-custom", icon: <BadgeIconCustom /> },
] as const;

function BadgeIconOsaka() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8.5 14.5A2.5 2.5 0 0 1 11 12c0-1.38-.5-2.5-1-3.5a2.5 2.5 0 0 1 5 0c.5 1 .5 2.1 0 3.5a2.5 2.5 0 0 1-5 0c-.5 0-1-.5-1.5-1.5" />
      <path d="M12 17.5a2.5 2.5 0 0 1 0-5A4.5 4.5 0 0 0 7.5 15" />
    </svg>
  );
}

function BadgeIconAnon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}

function BadgeIconRandom() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12V7H5" />
      <path d="M21 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2" />
      <path d="M16 19h6" />
      <path d="M19 16v6" />
    </svg>
  );
}

function BadgeIconCustom() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="M15 5 5 15" />
    </svg>
  );
}

export function CommentForm() {
  const { t, locale } = useI18n();
  const c = t.home;
  const [state, action, pending] = useActionState(postComment, initial);
  const [badgeType, setBadgeType] = useState<"osaka" | "anonymous" | "random" | "">("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showBadgePicker, setShowBadgePicker] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    checkAdmin().then((result) => {
      setIsAdmin(result.isAdmin);
    });
  }, []);

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCharCount(e.target.value.length);
  };

  const getSelectedBadge = () => {
    if (!isAdmin) return null;
    return BADGE_OPTIONS.find(b => b.value === badgeType) ?? null;
  };

  const selectedBadge = getSelectedBadge();
  const isCustomName = badgeType === "";
  const maxChars = contentLimits.commentBody;

  return (
    <form className="comment-form" action={action} onSubmit={(e) => {
      if (charCount < 2 || charCount > maxChars) e.preventDefault();
    }}>
      <Honeypot />
      <TurnstileField />

      <div className="comment-form-header">
        <h3 className="comment-form-title">{c.commentFormTitle}</h3>
        <p className="comment-form-hint">{c.commentHint}</p>
      </div>

      {isAdmin && (
        <fieldset className="badge-picker">
          <legend>{c.selectBadge}</legend>
          <div className="badge-picker-grid" role="radiogroup" aria-label={c.selectBadge}>
            {BADGE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`badge-picker-option ${badgeType === option.value ? "selected" : ""} ${option.className}`}
                role="radio"
                aria-checked={badgeType === option.value}
                tabIndex={0}
                onClick={() => setBadgeType(option.value as "osaka" | "anonymous" | "random" | "")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setBadgeType(option.value as "osaka" | "anonymous" | "random" | "");
                  }
                }}
              >
                <span className="badge-picker-icon" aria-hidden="true">{option.icon}</span>
                <span className="badge-picker-label">{c[option.labelKey as keyof typeof c]}</span>
                {badgeType === option.value && <span className="badge-picker-check" aria-hidden="true">✓</span>}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="comment-form-fields">
        {(isAdmin && !isCustomName) || !isAdmin ? null : (
          <div className="form-field">
            <label htmlFor="comment-author" className="field-label">
              {c.commentName}
              <span className="field-optional">({c.commentNamePlaceholder})</span>
            </label>
            <input
              id="comment-author"
              name="author"
              type="text"
              maxLength={contentLimits.commentAuthor}
              autoComplete="nickname"
              placeholder={c.commentNamePlaceholder}
              disabled={isAdmin && !isCustomName}
              className="field-input"
            />
          </div>
        )}

        <div className="form-field">
          <label htmlFor="comment-body" className="field-label">
            {c.commentBody}
            <span className="char-counter" data-current={charCount} data-max={maxChars}>
              {charCount}/{maxChars}
            </span>
          </label>
          <textarea
            id="comment-body"
            name="body"
            rows={4}
            required
            minLength={2}
            maxLength={maxChars}
            placeholder={c.commentBodyPlaceholder}
            onChange={handleBodyChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`field-textarea ${isFocused ? "focused" : ""} ${charCount > maxChars ? "error" : ""} ${charCount < 2 && charCount > 0 ? "error" : ""}`}
            disabled={pending}
          />
          <div className="textarea-footer">
            <span className={`textarea-hint ${charCount >= 2 && charCount <= maxChars ? "success" : ""}`} aria-live="polite">
              {charCount < 2 ? `${2 - charCount} ${locale === "tr" ? "karakter daha" : "more chars"}` : charCount >= 2 && charCount <= maxChars ? <CheckIcon /> : `${charCount - maxChars} ${locale === "tr" ? "karakter fazla" : "chars over"}`}
            </span>
          </div>
        </div>
      </div>

      {state.error && (
        <div className="form-message error" role="alert">
          <WarningIcon className="message-icon" aria-hidden="true" />
          {state.error}
        </div>
      )}

      {state.ok && (
        <div className="form-message success" role="status">
          <CheckIcon className="message-icon" aria-hidden="true" />
          {c.commentPosted}
        </div>
      )}

      <div className="comment-form-actions">
        <button
          type="submit"
          className={`btn btn-primary ${pending ? "loading" : ""}`}
          disabled={pending || charCount < 2 || charCount > maxChars}
        >
          {pending ? (
            <>
              <span className="btn-spinner" aria-hidden="true"></span>
              {c.commentSending}
            </>
          ) : (
            c.commentSend
          )}
        </button>
      </div>
    </form>
  );
}