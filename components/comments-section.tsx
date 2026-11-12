"use client";

import { useState } from "react";
import type { CommentItem } from "@/lib/content/load";
import { CommentForm } from "@/components/comment-form";
import { CommentThread } from "@/components/comment-thread";
import { type Locale, type messages } from "@/lib/i18n";

type Labels = (typeof messages)[Locale]["home"];

interface CommentsSectionProps {
  comments: CommentItem[];
  labels: Labels;
  locale: Locale;
}

export function CommentsSection({ comments, labels, locale }: CommentsSectionProps) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  return (
    <section className="section" aria-labelledby="yorumlar">
      <div className="section-head">
        <p className="pixel">00</p>
        <h2 id="yorumlar">{labels.comments}</h2>
      </div>
      <div className="comment-layout">
        <CommentForm />
        {comments.length === 0 ? (
          <p className="muted">{labels.commentsEmpty}</p>
        ) : (
          <CommentThread
            comments={comments}
            labels={labels}
            locale={locale}
            isReplyingTo={replyingTo}
            onReplyClick={setReplyingTo}
          />
        )}
      </div>
    </section>
  );
}