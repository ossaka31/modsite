import type { GalleryImage } from "@/lib/content/types";
import type { CommentItem } from "@/lib/content/load";
import type { SiteContent } from "@/lib/content/schema";
import { CommentForm } from "@/components/comment-form";
import { CommentThread } from "@/components/comment-thread";
import { CommentsSection } from "@/components/comments-section";
import { type Locale, type messages } from "@/lib/i18n";

type Labels = (typeof messages)[Locale]["home"];

export function HomeView({
  site,
  gallery,
  comments,
  labels,
  locale,
}: {
  site: SiteContent;
  gallery: GalleryImage[];
  comments: CommentItem[];
  labels: Labels;
  locale: Locale;
}) {
  const paragraphs = site.story.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const liveLinks = site.links.filter((link) => link.href.trim().length > 0);
  const dateFormat = new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
    dateStyle: "medium",
  });
  const commentDate = (iso: string) => {
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? "" : dateFormat.format(parsed);
  };
  let section = 0;
  const number = () => String(++section).padStart(2, "0");

  return (
    <main id="icerik" className="page">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="pixel">{site.eyebrow}</span>
          </p>
          <h1>{site.modName}</h1>
          <p className="lede">{site.tagline}</p>
          <p className="byline">
            {site.publisherAvatar ? (
              <img className="byline-avatar" src={site.publisherAvatar} alt="" width={30} height={30} />
            ) : null}
            {labels.publisher} <strong>{site.publisher}</strong>
          </p>
          <div className="hero-actions">
            <a className="btn btn-ember" href="#indir">
              {labels.toDownload}
            </a>
            <a className="btn btn-ghost" href="#kurulum">
              {labels.seeInstall}
            </a>
          </div>
        </div>
        <figure className="hero-frame">
          <img src={site.heroImage} alt={`${site.modName} ${labels.coverAlt}`} width={1200} height={1200} />
        </figure>
      </section>

      <section className="section" aria-labelledby="gereksinimler">
        <div className="section-head">
          <p className="pixel">{number()}</p>
          <h2 id="gereksinimler">{labels.details}</h2>
        </div>
        <ul className="hotbar">
          <li className="slot">
            <span className="pixel">{labels.publisher}</span>
            {site.publisherAvatar ? (
              <img className="slot-avatar" src={site.publisherAvatar} alt={site.publisher} width={64} height={64} />
            ) : (
              <span className="slot-avatar is-initial" aria-hidden="true">
                {site.publisher.trim().slice(0, 1) || "?"}
              </span>
            )}
            <strong>{site.publisher}</strong>
            <p>{site.publisherBio || site.eyebrow}</p>
          </li>
          {site.requirements.map((item) => (
            <li key={item.id} className="slot">
              <span className="pixel">{item.kicker}</span>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </li>
          ))}
          {site.languages.map((item) => (
            <li key={item.id} className="slot">
              <span className="pixel">{labels.lang}</span>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="section prose-section" aria-labelledby="anlati">
        <div className="section-head">
          <p className="pixel">{number()}</p>
          <h2 id="anlati">{labels.mod}</h2>
        </div>
        <div className="prose">
          {paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      {site.features.length > 0 ? (
        <section className="section" aria-labelledby="ozellikler">
          <div className="section-head">
            <p className="pixel">{number()}</p>
            <h2 id="ozellikler">{labels.adds}</h2>
          </div>
          <ul className="feature-grid">
            {site.features.map((feature) => (
              <li key={feature.id} className="feature">
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="section" id="kurulum" aria-labelledby="kurulum-baslik">
        <div className="section-head">
          <p className="pixel">{number()}</p>
          <h2 id="kurulum-baslik">{labels.install}</h2>
        </div>
        <ol className="steps">
          {site.steps.map((step, index) => (
            <li key={step.id} className="step">
              <span className="pixel">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="download-band" id="indir" aria-labelledby="indir-baslik">
        <div>
          <p className="pixel">{number()}</p>
          <h2 id="indir-baslik">{labels.download}</h2>
          <p>{labels.downloadNote}</p>
          <ul className="check-row">
            {site.requirements.map((item) => (
              <li key={item.id}>{item.title}</li>
            ))}
          </ul>
        </div>
        <div className="download-actions">
          {site.downloadUrl ? (
            <a className="btn btn-ember" href={site.downloadUrl} rel="noopener noreferrer">
              {site.downloadLabel}
            </a>
          ) : (
            <span className="btn btn-ember is-disabled">{labels.noLink}</span>
          )}
          {liveLinks.length > 0 ? (
            <ul className="links">
              {liveLinks.map((link) => (
                <li key={link.id}>
                  <a href={link.href} rel="noopener noreferrer">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      {gallery.length > 0 ? (
        <section className="section" aria-labelledby="galeri">
          <div className="section-head">
            <p className="pixel">{number()}</p>
            <h2 id="galeri">{labels.gallery}</h2>
          </div>
          <ul className="gallery-grid">
            {gallery.map((image) => (
              <li key={image.id}>
                <img src={image.url} alt={image.alt || `${site.modName} ${labels.imageAlt}`} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {site.changelog.length > 0 ? (
        <section className="section" aria-labelledby="surumler">
          <div className="section-head">
            <p className="pixel">{number()}</p>
            <h2 id="surumler">{labels.notes}</h2>
          </div>
          <ol className="changelog">
            {site.changelog.map((entry) => (
              <li key={entry.id}>
                <div className="changelog-meta">
                  <strong>{entry.version}</strong>
                  {entry.date ? <span>{entry.date}</span> : null}
                </div>
                <p>{entry.notes}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <CommentsSection comments={comments} labels={labels} locale={locale} />

      <footer className="footer">
        <p>{site.footerNote}</p>
      </footer>
    </main>
  );
}
