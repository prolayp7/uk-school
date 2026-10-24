import Link from "next/link";
import { PublicLayout } from "@/components/public-layout";
import { PublicState } from "@/components/public-state";
import { getPublicData } from "@/lib/api/client";
import type { PublicCollection } from "@/lib/api/types";

export const metadata = { title: "News" };

function publishedDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(date);
}

export default async function NewsPage() {
  const result = await getPublicData<PublicCollection>("/website/news", 100);
  if (result.error) {
    return (
      <PublicLayout schoolName="School website">
        <div className="site-container section">
          <PublicState kind="error" message={result.error.message} title="News is unavailable" />
        </div>
      </PublicLayout>
    );
  }
  return (
    <PublicLayout schoolName={result.data.school.name}>
      <section className="page-hero">
        <div className="site-container page-hero-inner">
          <h1>News</h1>
          <p>Updates published by the school.</p>
        </div>
      </section>
      <section className="section">
        <div className="site-container">
          {result.data.items.length === 0 ? (
            <PublicState message="There are no published news items to show." title="No news published" />
          ) : (
            <div className="news-grid">
              {result.data.items.map((item) => (
                <Link className="news-item" href={`/news/${encodeURIComponent(item.slug)}`} key={item.slug}>
                  <h2>{item.title}</h2>
                  {typeof item.content.summary === "string" && <p>{item.content.summary}</p>}
                  {typeof item.content.publishedOn === "string" && publishedDate(item.content.publishedOn) && (
                    <time dateTime={item.content.publishedOn}>{publishedDate(item.content.publishedOn)}</time>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
