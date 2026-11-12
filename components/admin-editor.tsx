"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addGalleryLink,
  deleteComment,
  deleteGallery,
  moveGallery,
  saveSite,
  updateGalleryAlt,
  uploadAvatar,
  uploadGallery,
  uploadHero,
} from "@/app/actions/admin";
import type { GalleryImage } from "@/lib/content/types";
import type { SiteContent } from "@/lib/content/schema";
import type { CommentItem } from "@/lib/content/load";
import { contentLimits } from "@/lib/content/limits";
import { isSafeImageSrc } from "@/lib/urls";
import { useI18n } from "@/components/i18n-provider";
import { CommentThread } from "@/components/comment-thread";

type AuditEvent = { id: number; action: string; detail: string; createdAt: string };
type CommentRow = CommentItem;
type TabId = "identity" | "content" | "media" | "comments" | "status";

function newId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
  const next = index + direction;
  if (next < 0 || next >= items.length) return items;
  const copy = items.slice();
  const [row] = copy.splice(index, 1);
  if (!row) return items;
  copy.splice(next, 0, row);
  return copy;
}

export function AdminEditor({
  initialSite,
  gallery,
  audit,
  comments,
}: {
  initialSite: SiteContent;
  gallery: GalleryImage[];
  audit: AuditEvent[];
  comments: CommentRow[];
}) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const a = t.admin;
  const [site, setSite] = useState(initialSite);
  const [tab, setTab] = useState<TabId>("identity");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = a.leaveWarning;
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, a.leaveWarning]);

  function patch(partial: Partial<SiteContent>) {
    setSaved(false);
    setDirty(true);
    setSite((current) => ({ ...current, ...partial }));
  }

  async function onSave() {
    setPending(true);
    setError(null);
    const result = await saveSite(site);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    setDirty(false);
    router.refresh();
  }

  async function onHero(formData: FormData) {
    setUploadError(null);
    const result = await uploadHero(formData);
    if (!result.ok) {
      setUploadError(result.error);
      return;
    }
    router.refresh();
  }

  async function onAvatar(formData: FormData) {
    setUploadError(null);
    const result = await uploadAvatar(formData);
    if (!result.ok) {
      setUploadError(result.error);
      return;
    }
    setSite((current) => ({
      ...current,
      publisherAvatar: result.url,
      publisherAvatarPath: result.path,
    }));
    router.refresh();
  }

  async function onGallery(formData: FormData) {
    setUploadError(null);
    const result = await uploadGallery(formData);
    if (!result.ok) {
      setUploadError(result.error);
      return;
    }
    router.refresh();
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "identity", label: a.tabIdentity },
    { id: "content", label: a.tabContent },
    { id: "media", label: a.tabMedia },
    { id: "comments", label: a.tabComments },
    { id: "status", label: a.tabStatus },
  ];

  const missing: string[] = [];
  if (!site.modName.trim()) missing.push(a.modName);
  if (!site.eyebrow.trim()) missing.push(a.eyebrow);
  if (!site.publisher.trim()) missing.push(a.publisher);
  if (!site.tagline.trim()) missing.push(a.tagline);
  if (!site.story.trim()) missing.push(a.story);
  if (!site.seoDescription.trim()) missing.push(a.seo);
  if (!site.downloadLabel.trim()) missing.push(a.buttonText);
  if (site.requirements.length === 0) missing.push(a.requirements);
  if (site.steps.length === 0) missing.push(a.steps);

  const counts: { label: string; value: number }[] = [
    { label: a.requirements, value: site.requirements.length },
    { label: a.steps, value: site.steps.length },
    { label: a.features, value: site.features.length },
    { label: a.changelog, value: site.changelog.length },
    { label: a.links, value: site.links.length },
    { label: a.languages, value: site.languages.length },
    { label: a.gallery, value: gallery.length },
    { label: a.commentsTitle, value: comments.length },
  ];

  return (
    <div className="admin">
      <header className="admin-head">
        <div>
          <p className="pixel">{a.kicker}</p>
          <h1>{a.title}</h1>
          <p className="muted">{a.intro}</p>
        </div>
        <button className="btn btn-ember" type="button" onClick={onSave} disabled={pending}>
          {pending ? a.saving : a.save}
        </button>
      </header>
      {error ? <p className="error" role="alert">{error}</p> : null}
      {uploadError ? <p className="error" role="alert">{uploadError}</p> : null}
      {saved ? <p className="ok" role="status">{a.saved}</p> : null}
      {dirty ? <p className="warn" role="status">{a.unsaved}</p> : null}

      <nav className="admin-tabs" role="tablist" aria-label={a.title}>
        {tabs.map((item) => (
          <button
            key={item.id}
            id={`admin-tab-${item.id}`}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            aria-controls={`admin-panel-${item.id}`}
            className={tab === item.id ? "tab is-active" : "tab"}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === "identity" ? (
        <div className="tab-panel" role="tabpanel" id="admin-panel-identity" aria-labelledby="admin-tab-identity">
          <section className="panel">
            <h2>{a.identity}</h2>
            <div className="form-grid">
              <Field label={a.modName} value={site.modName} max={contentLimits.modName} onChange={(modName) => patch({ modName })} />
              <Field label={a.eyebrow} value={site.eyebrow} max={contentLimits.eyebrow} onChange={(eyebrow) => patch({ eyebrow })} />
              <Field label={a.publisher} value={site.publisher} max={contentLimits.publisher} onChange={(publisher) => patch({ publisher })} />
              <Field label={a.seo} value={site.seoDescription} max={contentLimits.seo} onChange={(seoDescription) => patch({ seoDescription })} />
            </div>
            <Area label={a.tagline} value={site.tagline} max={contentLimits.tagline} onChange={(tagline) => patch({ tagline })} />
            <Area label={a.story} value={site.story} max={contentLimits.story} onChange={(story) => patch({ story })} rows={8} />
            <Area label={a.footer} value={site.footerNote} max={contentLimits.footer} onChange={(footerNote) => patch({ footerNote })} />
          </section>

          <section className="panel">
            <h2>{a.publisherProfile}</h2>
            <div className="publisher-row">
              {site.publisherAvatar ? (
                <img className="avatar-preview" src={site.publisherAvatar} alt={site.publisher} />
              ) : (
                <span className="avatar-preview is-initial" aria-hidden="true">
                  {site.publisher.trim().slice(0, 1) || "?"}
                </span>
              )}
              <div className="publisher-fields">
                <form action={onAvatar} className="upload-row">
                  <input name="file" type="file" accept="image/jpeg,image/png,image/webp" required />
                  <button className="btn btn-ghost" type="submit">{a.uploadAvatar}</button>
                </form>
                <p className="muted">{a.avatarHint}</p>
              </div>
            </div>
            <ImageSrcField
              label={a.avatarUrl}
              value={site.publisherAvatar}
              max={contentLimits.imageSrc}
              onChange={(publisherAvatar) => patch({ publisherAvatar })}
              hint={a.urlHint}
            />
            <Area label={a.publisherBio} value={site.publisherBio} max={contentLimits.publisherBio} onChange={(publisherBio) => patch({ publisherBio })} />
          </section>
        </div>
      ) : null}

      {tab === "content" ? (
        <div className="tab-panel" role="tabpanel" id="admin-panel-content" aria-labelledby="admin-tab-content">
          <section className="panel">
            <h2>{a.download}</h2>
            <div className="form-grid">
              <Field label={a.buttonText} value={site.downloadLabel} max={contentLimits.downloadLabel} onChange={(downloadLabel) => patch({ downloadLabel })} />
              <Field label={a.https} value={site.downloadUrl} max={contentLimits.downloadUrl} onChange={(downloadUrl) => patch({ downloadUrl })} />
            </div>
          </section>

          <ItemList
            title={a.requirements}
            items={site.requirements}
            onChange={(requirements) => patch({ requirements })}
            create={() => ({ id: newId(), kicker: "ETIKET", title: a.heading, detail: a.body })}
            render={(item, update) => (
              <>
                <Field label={a.label} value={item.kicker} max={contentLimits.requirementKicker} onChange={(kicker) => update({ kicker })} />
                <Field label={a.heading} value={item.title} max={contentLimits.requirementTitle} onChange={(title) => update({ title })} />
                <Area label={a.body} value={item.detail} max={contentLimits.requirementDetail} onChange={(detail) => update({ detail })} />
              </>
            )}
          />

          <ItemList
            title={a.languages}
            items={site.languages}
            onChange={(languages) => patch({ languages })}
            create={() => ({ id: newId(), title: a.languages, detail: a.body })}
            empty={a.emptyLanguages}
            render={(item, update) => (
              <>
                <Field label={a.heading} value={item.title} max={contentLimits.languageTitle} onChange={(title) => update({ title })} />
                <Area label={a.body} value={item.detail} max={contentLimits.languageDetail} onChange={(detail) => update({ detail })} />
              </>
            )}
          />

          <ItemList
            title={a.steps}
            items={site.steps}
            onChange={(steps) => patch({ steps })}
            create={() => ({ id: newId(), title: a.heading, body: a.body })}
            render={(item, update) => (
              <>
                <Field label={a.heading} value={item.title} max={contentLimits.stepTitle} onChange={(title) => update({ title })} />
                <Area label={a.text} value={item.body} max={contentLimits.stepBody} onChange={(body) => update({ body })} />
              </>
            )}
          />

          <ItemList
            title={a.features}
            items={site.features}
            onChange={(features) => patch({ features })}
            create={() => ({ id: newId(), title: a.heading, body: a.body })}
            empty={a.emptyFeatures}
            render={(item, update) => (
              <>
                <Field label={a.heading} value={item.title} max={contentLimits.featureTitle} onChange={(title) => update({ title })} />
                <Area label={a.text} value={item.body} max={contentLimits.featureBody} onChange={(body) => update({ body })} />
              </>
            )}
          />

          <ItemList
            title={a.changelog}
            items={site.changelog}
            onChange={(changelog) => patch({ changelog })}
            create={() => ({ id: newId(), version: "0.1.0", date: "", notes: a.note })}
            empty={a.emptyNotes}
            render={(item, update) => (
              <>
                <Field label={a.version} value={item.version} max={contentLimits.changelogVersion} onChange={(version) => update({ version })} />
                <Field label={a.date} value={item.date} max={contentLimits.changelogDate} onChange={(date) => update({ date })} />
                <Area label={a.note} value={item.notes} max={contentLimits.changelogNotes} onChange={(notes) => update({ notes })} />
              </>
            )}
          />

          <ItemList
            title={a.links}
            items={site.links}
            onChange={(links) => patch({ links })}
            create={() => ({ id: newId(), label: a.linkText, href: "" })}
            empty={a.emptyLinks}
            render={(item, update) => (
              <>
                <Field label={a.linkText} value={item.label} max={contentLimits.linkLabel} onChange={(label) => update({ label })} />
                <Field label={a.https} value={item.href} max={contentLimits.linkHref} onChange={(href) => update({ href })} />
              </>
            )}
          />
        </div>
      ) : null}

      {tab === "media" ? (
        <div className="tab-panel" role="tabpanel" id="admin-panel-media" aria-labelledby="admin-tab-media">
          <section className="panel">
            <h2>{a.cover}</h2>
            <img className="admin-preview" src={site.heroImage} alt="" />
            <form action={onHero} className="upload-row">
              <input name="file" type="file" accept="image/jpeg,image/png,image/webp" required />
              <button className="btn btn-ghost" type="submit">{a.changeCover}</button>
            </form>
            <p className="muted">{a.coverHint}</p>
            <ImageSrcField
              label={a.coverUrl}
              value={site.heroImage}
              max={contentLimits.imageSrc}
              onChange={(heroImage) => patch({ heroImage })}
              hint={a.urlHint}
            />
          </section>

          <section className="panel">
            <h2>{a.gallery}</h2>
            <form action={onGallery} className="upload-row">
              <input name="file" type="file" accept="image/jpeg,image/png,image/webp" required />
              <input name="alt" type="text" maxLength={140} placeholder={a.alt} />
              <button className="btn btn-ghost" type="submit">{a.add}</button>
            </form>
            <GalleryLinkForm onDone={() => router.refresh()} />
            <ul className="admin-gallery">
              {gallery.map((image, index) => (
                <li key={image.id}>
                  <img src={image.url} alt="" />
                  <form
                    action={async (formData) => {
                      await updateGalleryAlt(image.id, String(formData.get("alt") ?? ""));
                      router.refresh();
                    }}
                  >
                    <input name="alt" defaultValue={image.alt} maxLength={140} />
                    <button className="btn btn-ghost btn-small" type="submit">{a.saveAlt}</button>
                  </form>
                  <div className="row-actions">
                    <button type="button" className="btn btn-ghost btn-small" disabled={index === 0} onClick={async () => { await moveGallery(image.id, -1); router.refresh(); }}>{a.up}</button>
                    <button type="button" className="btn btn-ghost btn-small" disabled={index === gallery.length - 1} onClick={async () => { await moveGallery(image.id, 1); router.refresh(); }}>{a.down}</button>
                    <button type="button" className="btn btn-ghost btn-small" onClick={async () => { await deleteGallery(image.id); router.refresh(); }}>{a.remove}</button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}

      {tab === "comments" ? (
        <div className="tab-panel" role="tabpanel" id="admin-panel-comments" aria-labelledby="admin-tab-comments">
          <section className="panel">
            <h2>{a.commentsTitle}</h2>
            {comments.length === 0 ? (
              <p className="muted">{a.emptyComments}</p>
            ) : (
              <CommentThread
                comments={comments}
                labels={t.home}
                locale={locale}
                isReplyingTo={null}
                manageable={true}
              />
            )}
          </section>
        </div>
      ) : null}

      {tab === "status" ? (
        <div className="tab-panel" role="tabpanel" id="admin-panel-status" aria-labelledby="admin-tab-status">
          <section className="panel">
            <h2>{a.status}</h2>
            <p className="pixel">{a.counts}</p>
            <ul className="counter-row">
              {counts.map((row) => (
                <li key={row.label}>
                  <span className="pixel">{row.label}</span>
                  <strong>{row.value}</strong>
                </li>
              ))}
            </ul>
            {missing.length === 0 ? (
              <p className="ok">{a.allGood}</p>
            ) : (
              <p className="error">{a.missingFields}: {missing.join(", ")}</p>
            )}
            {!site.downloadUrl.trim() ? <p className="muted">{a.https}: {t.home.noLink}</p> : null}
          </section>

          <section className="panel">
            <h2>{a.audit}</h2>
            {audit.length === 0 ? <p className="muted">{a.noAudit}</p> : (
              <ul className="audit-list">
                {audit.map((event) => (
                  <li key={event.id}>
                    <span>{event.createdAt}</span>
                    <strong>{event.action}</strong>
                    <p>{event.detail}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}

/** Görsel adresi yazılan yerlerde "Önizle" düğmesiyle resmi gösterir. */
function ImageSrcField({
  label,
  value,
  onChange,
  max,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  max?: number;
  hint?: string;
}) {
  const { t } = useI18n();
  const id = useId();
  const [show, setShow] = useState(false);
  const trimmed = value.trim();
  const valid = isSafeImageSrc(trimmed);

  return (
    <div className="image-src">
      <label className="field" htmlFor={id}>
        {label}
        <input
          id={id}
          value={value}
          maxLength={max}
          placeholder="https://..."
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      <div className="row-actions">
        <button
          type="button"
          className="btn btn-ghost btn-small"
          disabled={!valid}
          onClick={() => setShow((current) => !current)}
        >
          {show ? t.admin.hidePreview : t.admin.preview}
        </button>
        {trimmed && !valid ? <span className="error">{t.admin.previewInvalid}</span> : null}
      </div>
      {show && valid ? <img className="url-preview" src={trimmed} alt="" /> : null}
      {hint ? <p className="muted">{hint}</p> : null}
    </div>
  );
}

/** Depoya dosya koymadan galeriye dış bağlantı ekler. */
function GalleryLinkForm({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const a = t.admin;
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = url.trim();
  const valid = isSafeImageSrc(trimmed);

  async function submit() {
    setPending(true);
    setError(null);
    const result = await addGalleryLink(url, alt);
    if (!result.ok) {
      setPending(false);
      setError(result.error);
      return;
    }
    setPending(false);
    setUrl("");
    setAlt("");
    setShow(false);
    onDone();
  }

  return (
    <div className="image-src">
      <div className="form-grid">
        <label className="field">
          {a.imageUrl}
          <input
            value={url}
            maxLength={contentLimits.imageSrc}
            placeholder="https://..."
            onChange={(event) => setUrl(event.target.value)}
          />
        </label>
        <label className="field">
          {a.alt}
          <input value={alt} maxLength={140} onChange={(event) => setAlt(event.target.value)} />
        </label>
      </div>
      <div className="row-actions">
        <button
          type="button"
          className="btn btn-ghost btn-small"
          disabled={!valid}
          onClick={() => setShow((current) => !current)}
        >
          {show ? a.hidePreview : a.preview}
        </button>
        <button type="button" className="btn btn-ghost btn-small" disabled={!valid || pending} onClick={submit}>
          {a.addFromLink}
        </button>
      </div>
      {trimmed && !valid ? <p className="error">{a.previewInvalid}</p> : null}
      {error ? <p className="error" role="alert">{error}</p> : null}
      {show && valid ? <img className="url-preview" src={trimmed} alt="" /> : null}
      <p className="muted">{a.urlHint}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  max?: number;
}) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      {label}
      <input id={id} value={value} maxLength={max} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Area({
  label,
  value,
  onChange,
  max,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  max?: number;
  rows?: number;
}) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      {label}
      <textarea
        id={id}
        rows={rows}
        value={value}
        maxLength={max}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ItemList<T extends { id: string }>({
  title,
  items,
  onChange,
  create,
  render,
  empty,
}: {
  title: string;
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  render: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode;
  empty?: string;
}) {
  const { t } = useI18n();
  return (
    <section className="panel">
      <div className="panel-title">
        <h2>{title}</h2>
        <button className="btn btn-ghost btn-small" type="button" onClick={() => onChange([...items, create()])}>
          {t.admin.add}
        </button>
      </div>
      {items.length === 0 && empty ? <p className="muted">{empty}</p> : null}
      <ul className="item-list">
        {items.map((item, index) => (
          <li key={item.id}>
            {render(item, (patch) => {
              const next = items.slice();
              next[index] = { ...item, ...patch };
              onChange(next);
            })}
            <div className="row-actions">
              <button type="button" className="btn btn-ghost btn-small" disabled={index === 0} onClick={() => onChange(moveItem(items, index, -1))}>{t.admin.up}</button>
              <button type="button" className="btn btn-ghost btn-small" disabled={index === items.length - 1} onClick={() => onChange(moveItem(items, index, 1))}>{t.admin.down}</button>
              <button type="button" className="btn btn-ghost btn-small" onClick={() => onChange(items.filter((row) => row.id !== item.id))}>{t.admin.remove}</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
