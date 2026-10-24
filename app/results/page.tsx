import { ContentBody } from "@/components/content-renderer";
import { PublicLayout } from "@/components/public-layout";
import { PublicState } from "@/components/public-state";
import { getPublicData } from "@/lib/api/client";
import type { PublicCollection } from "@/lib/api/types";

export const metadata = { title: "Results" };

export default async function ResultsPage() {
  const result = await getPublicData<PublicCollection>("/website/results", 100);
  if (result.error) {
    return (
      <PublicLayout schoolName="School website">
        <div className="site-container section">
          <PublicState kind="error" message={result.error.message} title="Results are unavailable" />
        </div>
      </PublicLayout>
    );
  }
  return (
    <PublicLayout schoolName={result.data.school.name}>
      <section className="page-hero">
        <div className="site-container page-hero-inner">
          <h1>Results</h1>
          <p>Results information published by the school.</p>
        </div>
      </section>
      <section className="section">
        <div className="site-container">
          {result.data.items.length === 0 ? (
            <PublicState message="There are no published results to show." title="No results published" />
          ) : (
            <div className="news-grid">
              {result.data.items.map((item) => (
                <article className="news-item" key={item.slug}>
                  <h2>{typeof item.content.headline === "string" ? item.content.headline : item.title}</h2>
                  {typeof item.content.summary === "string" && <p>{item.content.summary}</p>}
                  <ContentBody content={item.content} />
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
