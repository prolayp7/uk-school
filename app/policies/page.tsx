import Link from "next/link";
import { PublicLayout } from "@/components/public-layout";
import { PublicState } from "@/components/public-state";
import { getPublicData } from "@/lib/api/client";
import type { PublicCollection } from "@/lib/api/types";

export const metadata = { title: "Policies" };

export default async function PoliciesPage() {
  const result = await getPublicData<PublicCollection>("/website/policies", 100);
  if (result.error) {
    return (
      <PublicLayout schoolName="School website">
        <div className="site-container section">
          <PublicState kind="error" message={result.error.message} title="Policies are unavailable" />
        </div>
      </PublicLayout>
    );
  }
  return (
    <PublicLayout schoolName={result.data.school.name}>
      <section className="page-hero">
        <div className="site-container page-hero-inner">
          <h1>Policies</h1>
          <p>Policies published by the school.</p>
        </div>
      </section>
      <section className="section">
        <div className="site-container">
          {result.data.items.length === 0 ? (
            <PublicState message="There are no published policies to show." title="No policies published" />
          ) : (
            <div className="document-grid">
              {result.data.items.map((policy) => (
                <article className="document-item" key={policy.slug}>
                  <div>
                    <strong>{policy.title}</strong>
                    {typeof policy.content.summary === "string" && <p>{policy.content.summary}</p>}
                  </div>
                  <Link className="link-arrow" href={`/policies/${encodeURIComponent(policy.slug)}`}>
                    View
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
