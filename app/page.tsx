import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { CmsImage, ContentBody } from "@/components/content-renderer";
import { PublicLayout } from "@/components/public-layout";
import { PublicState } from "@/components/public-state";
import { getPublicData } from "@/lib/api/client";
import type { PublicEvent, PublicHomepage } from "@/lib/api/types";

export async function generateMetadata(): Promise<Metadata> {
  const result = await getPublicData<PublicHomepage>("/website/homepage", 6);
  if (result.error) return {};
  return {
    title: result.data.page.seo.title ?? result.data.page.title,
    description: result.data.page.seo.description ?? undefined,
  };
}

function textValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function safeHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return value;
  if (value.startsWith("https://")) return value;
  return null;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function EventPreview({ events }: { events: PublicEvent[] }) {
  if (events.length === 0) return null;
  return (
    <section className="section section-paper">
      <div className="site-container">
        <header className="section-heading">
          <h2>Upcoming events</h2>
        </header>
        <div className="event-list">
          {events.slice(0, 3).map((event) => (
            <article className="event-item" key={`${event.title}-${event.startsAt}`}>
              <time className="event-date" dateTime={event.startsAt}>
                {formatDate(event.startsAt)}
              </time>
              <div>
                <h2>{event.title}</h2>
                {event.description && <p>{event.description}</p>}
                {event.location && <p>{event.location}</p>}
              </div>
            </article>
          ))}
        </div>
        <p className="section-more">
          <Link className="admin-link" href="/events">
            View all events
          </Link>
        </p>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const result = await getPublicData<PublicHomepage>("/website/homepage", 6);
  if (result.error) {
    return (
      <PublicLayout schoolName="School website">
        <div className="site-container section">
          <PublicState
            kind="error"
            message={`${result.error.message} School information will appear here when the website API is configured.`}
            title="School content is unavailable"
          />
        </div>
      </PublicLayout>
    );
  }

  const { school, page, navigation, news, events } = result.data;
  const content = page.content;
  const tagline = textValue(result.data.settings.tagline);
  const heading = textValue(content.heading) ?? page.title;
  const intro = textValue(content.intro);
  const imageUrl = safeHref(content.heroImageUrl);
  const primaryCta =
    typeof content.primaryCta === "object" && content.primaryCta !== null
      ? (content.primaryCta as { label?: unknown; url?: unknown })
      : null;
  const ctaLabel = textValue(primaryCta?.label);
  const ctaHref = safeHref(primaryCta?.url);
  const navItems = Array.isArray(navigation.items) ? navigation.items : [];

  return (
    <PublicLayout navigation={navItems} schoolName={school.name} settings={result.data.settings}>
      <section className="hero">
        <div className="hero-copy">
          {tagline && <p className="hero-eyebrow">{tagline}</p>}
          <h1>{heading}</h1>
          {intro && <p>{intro}</p>}
          <div className="hero-actions">
            {ctaLabel && ctaHref && (
              <a
                className="button"
                href={ctaHref}
                rel={ctaHref.startsWith("https://") ? "noreferrer" : undefined}
                target={ctaHref.startsWith("https://") ? "_blank" : undefined}
              >
                {ctaLabel}
              </a>
            )}
            <Link className="button button-secondary" href="/admissions">
              Admissions
            </Link>
          </div>
        </div>
        <div className="hero-media">
          {imageUrl ? (
            <Image alt="" height={1000} priority src={imageUrl} unoptimized width={1200} />
          ) : (
            <div aria-hidden="true" className="hero-placeholder">
              {school.name}
            </div>
          )}
        </div>
      </section>

      {Array.isArray(content.body) && content.body.length > 0 && (
        <section className="section section-paper">
          <div className="site-container home-story">
            <ContentBody content={content} />
          </div>
        </section>
      )}

      {news.length > 0 && (
        <section className="section">
          <div className="site-container">
            <header className="section-heading">
              <h2>News from school</h2>
            </header>
            <div className="news-grid">
              {news.slice(0, 4).map((item) => (
                <Link className="news-item" href={`/news/${encodeURIComponent(item.slug)}`} key={item.slug}>
                  {textValue(item.content.imageUrl) && (
                    <CmsImage
                      alt=""
                      className="news-photo"
                      url={textValue(item.content.imageUrl) ?? ""}
                    />
                  )}
                  <h3>{item.title}</h3>
                  {textValue(item.content.summary) && <p>{textValue(item.content.summary)}</p>}
                </Link>
              ))}
            </div>
            <p className="section-more">
              <Link className="admin-link" href="/news">
                All school news
              </Link>
            </p>
          </div>
        </section>
      )}

      <EventPreview events={events} />

      {!intro && news.length === 0 && events.length === 0 && (
        <div className="site-container">
          <PublicState
            message="The school has not published additional homepage information yet."
            title="More information will be added soon"
          />
        </div>
      )}

      <section className="section admissions-callout">
        <div className="site-container admissions-callout-inner">
          <div>
            <h2>Find out more about joining the school</h2>
            <p>Explore the admissions information published by the school.</p>
          </div>
          <Link className="button" href="/admissions">
            Admissions
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
