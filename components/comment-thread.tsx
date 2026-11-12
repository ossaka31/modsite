"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { postComment, type CommentState, type CommentBadgeType } from "@/app/actions/comments";
import { editComment, deleteComment } from "@/app/actions/admin";
import { checkAdmin } from "@/app/actions/auth";
import { contentLimits } from "@/lib/content/limits";
import { useI18n } from "@/components/i18n-provider";
import { Honeypot, TurnstileField } from "@/components/form-guards";
import type { CommentItem } from "@/lib/content/types";

function CheckIcon(props: React.SVGProps<SVGSVGElement> & { size?: number }) {
  const size = props.size ?? 16;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" width={size} height={size} {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function WarningIcon(props: React.SVGProps<SVGSVGElement> & { size?: number }) {
  const size = props.size ?? 16;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" width={size} height={size} {...props}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function TrashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function EditIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function ReplyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M3 10h10a5 5 0 0 1 5 5v2" />
      <path d="M3 10l5 5" />
      <path d="M3 10l5-5" />
    </svg>
  );
}

function BadgeIconOsaka(props: React.SVGProps<SVGSVGElement> & { size?: number }) {
  const size = props.size ?? 16;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" width={size} height={size} {...props}>
      <path d="M8.5 14.5A2.5 2.5 0 0 1 11 12c0-1.38-.5-2.5-1-3.5a2.5 2.5 0 0 1 5 0c.5 1 .5 2.1 0 3.5a2.5 2.5 0 0 1-5 0c-.5 0-1-.5-1.5-1.5" />
      <path d="M12 17.5a2.5 2.5 0 0 1 0-5A4.5 4.5 0 0 0 7.5 15" />
    </svg>
  );
}

function BadgeIconAnon(props: React.SVGProps<SVGSVGElement> & { size?: number }) {
  const size = props.size ?? 16;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" width={size} height={size} {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}

function BadgeIconRandom(props: React.SVGProps<SVGSVGElement> & { size?: number }) {
  const size = props.size ?? 16;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" width={size} height={size} {...props}>
      <path d="M21 12V7H5" />
      <path d="M21 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2" />
      <path d="M16 19h6" />
      <path d="M19 16v6" />
    </svg>
  );
}

function BadgeIconCustom(props: React.SVGProps<SVGSVGElement> & { size?: number }) {
  const size = props.size ?? 16;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" width={size} height={size} {...props}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="M15 5 5 15" />
    </svg>
  );
}

const BADGE_OPTIONS = [
  { value: "osaka", labelKey: "badgeOsaka", className: "badge-osaka" },
  { value: "anonymous", labelKey: "badgeAnonymous", className: "badge-anon" },
  { value: "random", labelKey: "badgeRandom", className: "badge-random" },
  { value: "", labelKey: "commentName", className: "badge-custom" },
] as const;

interface CommentThreadProps {
  comments: CommentItem[];
  labels: ReturnType<typeof useI18n>["t"]["home"];
  locale: "tr" | "en";
  isReplyingTo: string | null;
  onReplyClick?: (commentId: string | null) => void;
  manageable?: boolean;
}

const BADGE_LABELS: Record<Exclude<CommentBadgeType, null>, { tr: string; en: string }> = {
  osaka: { tr: "OSAKA", en: "OSAKA" },
  anonymous: { tr: "Anonim", en: "Anonymous" },
  random: { tr: "Rastgele", en: "Random" },
};

function getBadgeLabel(badge: CommentBadgeType, locale: "tr" | "en") {
  if (!badge) return locale === "tr" ? "Anonim" : "Anonymous";
  return BADGE_LABELS[badge]?.[locale] ?? (locale === "tr" ? "Anonim" : "Anonymous");
}

function getBadgeClass(badge: CommentBadgeType) {
  switch (badge) {
    case "osaka":
      return "badge-osaka";
    case "anonymous":
      return "badge-anon";
    case "random":
      return "badge-random";
    default:
      return "";
  }
}

function formatDate(iso: string, locale: "tr" | "en") {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function getRelativeTime(iso: string, locale: "tr" | "en") {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  const diff = Date.now() - parsed.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return locale === "tr" ? "az önce" : "just now";
  if (minutes < 60) return `${minutes} ${locale === "tr" ? "dk önce" : "m ago"}`;
  if (hours < 24) return `${hours} ${locale === "tr" ? "sa önce" : "h ago"}`;
  if (days < 7) return `${days} ${locale === "tr" ? "gün önce" : "d ago"}`;
  return formatDate(iso, locale);
}

export function CommentThread({
  comments,
  labels,
  locale,
  isReplyingTo,
  onReplyClick,
  manageable = false,
}: CommentThreadProps) {
  if (comments.length === 0) return null;

  return (
    <ul className="comment-thread" role="list" aria-label={labels.comments}>
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          labels={labels}
          locale={locale}
          isReplyingTo={isReplyingTo}
          onReplyClick={onReplyClick}
          manageable={manageable}
        />
      ))}
    </ul>
  );
}

interface CommentItemProps {
  comment: CommentItem;
  labels: ReturnType<typeof useI18n>["t"]["home"];
  locale: "tr" | "en";
  isReplyingTo: string | null;
  onReplyClick?: (commentId: string | null) => void;
  manageable?: boolean;
}

function CommentItem({ comment, labels, locale, isReplyingTo, onReplyClick, manageable = false }: CommentItemProps) {
  const [showReplies, setShowReplies] = useState(true);
  const isReplying = isReplyingTo === comment.id;
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);

  const authorName = comment.author || labels.commentAnon;
  const hasReplies = comment.replies.length > 0;

  const handleReplyClick = () => {
    onReplyClick?.(comment.id);
    setEditing(false);
  };

  const handleCancelReply = () => {
    onReplyClick?.(null);
  };

  const handleEditClick = () => {
    setEditBody(comment.body);
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditBody(comment.body);
  };

  const handleSaveEdit = async () => {
    const trimmed = editBody.trim();
    if (trimmed.length < 2) return;
    setEditing(false);
    const result = await editComment(comment.id, trimmed);
    if (!result.ok) {
      setEditing(true);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(locale === "tr" ? "Bu yorumu silmek istediğinizden emin misiniz?" : "Delete this comment?")) return;
    await deleteComment(comment.id);
  };

  return (
    <li className="comment-item">
      <article className={`comment-card ${editing ? "is-editing" : ""}`} id={`comment-${comment.id}`}>
        <header className="comment-header">
          <div className="comment-author-row">
            <div className="comment-avatar" aria-hidden="true">
              {authorName.charAt(0).toUpperCase()}
            </div>
            <div className="comment-meta">
              <strong className="comment-author">{authorName}</strong>
              {comment.badgeType && (
                <span className={`comment-badge ${getBadgeClass(comment.badgeType)}`}>
                  {getBadgeLabel(comment.badgeType, locale)}
                </span>
              )}
            </div>
            <div className="comment-actions">
              {manageable && (
                <>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm admin-edit-btn"
                    onClick={handleEditClick}
                    disabled={editing || isReplying}
                    aria-label={locale === "tr" ? "Düzenle" : "Edit"}
                  >
                    <EditIcon />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm admin-delete-btn"
                    onClick={handleDelete}
                    disabled={editing || isReplying}
                    aria-label={locale === "tr" ? "Sil" : "Delete"}
                  >
                    <TrashIcon />
                  </button>
                </>
              )}
            </div>
          </div>
          <time className="comment-time" dateTime={comment.createdAt} title={formatDate(comment.createdAt, locale)}>
            {getRelativeTime(comment.createdAt, locale)}
          </time>
        </header>

        {editing ? (
          <div className="comment-edit">
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={3}
              className="field-textarea"
              maxLength={contentLimits.commentBody}
              autoFocus
            />
            <div className="comment-edit-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleCancelEdit}>
                {locale === "tr" ? "İptal" : "Cancel"}
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveEdit}>
                {locale === "tr" ? "Kaydet" : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <div className="comment-body">{comment.body}</div>
        )}

        <footer className="comment-footer">
          <button
            type="button"
            className="btn btn-ghost btn-sm reply-btn"
            onClick={handleReplyClick}
            aria-expanded={isReplying}
            aria-controls={`reply-form-${comment.id}`}
            disabled={editing}
          >
            <ReplyIcon />
            <span>{labels.reply}</span>
          </button>

          {hasReplies && (
            <button
              type="button"
              className={`btn btn-ghost btn-sm toggle-replies ${!showReplies ? "collapsed" : ""}`}
              onClick={() => setShowReplies((prev) => !prev)}
              aria-expanded={showReplies}
              aria-controls={`replies-${comment.id}`}
              disabled={editing}
            >
              <span>
                {showReplies ? labels.hideReplies : labels.showReplies} ({comment.replies.length})
              </span>
            </button>
          )}
        </footer>

        {isReplying && (
          <ReplyForm
            id={`reply-form-${comment.id}`}
            parentId={comment.id}
            authorName={authorName}
            labels={labels}
            locale={locale}
            onCancel={handleCancelReply}
          />
        )}

        {hasReplies && showReplies && (
          <div id={`replies-${comment.id}`} className="comment-replies" role="group" aria-label={labels.comments}>
            <CommentThread
              comments={comment.replies}
              labels={labels}
              locale={locale}
              isReplyingTo={isReplyingTo}
              onReplyClick={onReplyClick}
              manageable={manageable}
            />
          </div>
        )}
      </article>
    </li>
  );
}

interface ReplyFormProps {
  id: string;
  parentId: string;
  authorName: string;
  labels: ReturnType<typeof useI18n>["t"]["home"];
  locale: "tr" | "en";
  onCancel: () => void;
}

function ReplyForm({ id, parentId, authorName, labels, locale, onCancel }: ReplyFormProps) {
  const initial: CommentState = {};
  const [state, action, pending] = useActionState(postComment, initial);
  const { t } = useI18n();
  const c = t.home;
  const [charCount, setCharCount] = useState(0);
  const [badgeType, setBadgeType] = useState<"osaka" | "anonymous" | "random" | "">("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdmin().then((result) => {
      setIsAdmin(result.isAdmin);
    });
  }, []);

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCharCount(e.target.value.length);
  };

  const maxChars = contentLimits.commentBody;
  const isCustomName = badgeType === "";
  const isValid = charCount >= 2 && charCount <= maxChars;

  return (
    <form id={id} className="reply-form" action={action}>
      <input type="hidden" name="parent_id" value={parentId} />
      <input type="hidden" name="badge_type" value={badgeType} />
      <Honeypot />
      <TurnstileField />

      <div className="reply-form-header">
        <div className="replying-to">
          <ReplyIcon className="replying-icon" />
          <span>{labels.replyingTo} <strong>{authorName}</strong></span>
        </div>
        <button type="button" className="btn btn-ghost btn-sm cancel-reply" onClick={onCancel}>
          <span className="sr-only">{labels.cancelReply}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {isAdmin && (
        <fieldset className="badge-picker badge-picker-compact">
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
                {option.value === "osaka" && <BadgeIconOsaka className="badge-picker-icon" />}
                {option.value === "anonymous" && <BadgeIconAnon className="badge-picker-icon" />}
                {option.value === "random" && <BadgeIconRandom className="badge-picker-icon" />}
                {option.value === "" && <BadgeIconCustom className="badge-picker-icon" />}
                <span className="badge-picker-label">{c[option.labelKey as keyof typeof c]}</span>
                {badgeType === option.value && <span className="badge-picker-check"><CheckIcon size={12} /></span>}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {!isAdmin || isCustomName ? (
        <div className="form-field">
          <label htmlFor={`reply-author-${parentId}`} className="field-label">
            {c.commentName}
            <span className="field-optional">({c.commentNamePlaceholder})</span>
          </label>
          <input
            id={`reply-author-${parentId}`}
            name="author"
            type="text"
            maxLength={contentLimits.commentAuthor}
            autoComplete="nickname"
            placeholder={c.commentNamePlaceholder}
            disabled={isAdmin && !isCustomName}
            className="field-input"
          />
        </div>
      ) : null}

      <div className="reply-form-field">
        <textarea
          id={`reply-body-${parentId}`}
          name="body"
          rows={3}
          required
          minLength={2}
          maxLength={maxChars}
          placeholder={c.commentBodyPlaceholder}
          onChange={handleBodyChange}
          className={`field-textarea ${!isValid && charCount > 0 ? "error" : ""}`}
          disabled={pending}
        />
        <div className="textarea-footer">
          <span className="char-counter">{charCount}/{maxChars}</span>
          <span className={`textarea-hint ${isValid ? "success" : ""}`} aria-live="polite">
            {charCount < 2 ? `${2 - charCount} ${locale === "tr" ? "karakter daha" : "more chars"}` : charCount >= 2 && charCount <= maxChars ? <CheckIcon size={14} /> : `${charCount - maxChars} ${locale === "tr" ? "karakter fazla" : "chars over"}`}
          </span>
        </div>
      </div>

      {state.error && (
        <div className="form-message error" role="alert">
          <WarningIcon size={16} className="message-icon" aria-hidden="true" />
          {state.error}
        </div>
      )}

      {state.ok && (
        <div className="form-message success" role="status">
          <CheckIcon size={16} className="message-icon" aria-hidden="true" />
          {c.commentPosted}
        </div>
      )}

      <div className="reply-form-actions">
        <button
          type="submit"
          className={`btn btn-primary ${pending ? "loading" : ""}`}
          disabled={pending || !isValid}
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