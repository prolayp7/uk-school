import { notFound } from "next/navigation";
import { ContentBody } from "@/components/content-renderer";
import { PublicLayout } from "@/components/public-layout";
import { PublicState } from "@/components/public-state";
import { getPublicData } from "@/lib/api/client";
import type { PublicCollection } from "@/lib/api/types";

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getPublicData<PublicCollection>("/website/policies", 100);
  if (result.error) {
    return (
      <PublicLayout schoolName="School website">
        <div className="site-container section">
          <PublicState kind="error" message={result.error.message} title="Policy is unavailable" />
        </div>
      </PublicLayout>
    );
  }
  const policy = result.data.items.find((item) => item.slug === slug);
  if (!policy) notFound();
  const fileUrl =
    typeof policy.content.fileUrl === "string" &&
    (policy.content.fileUrl.startsWith("/") || policy.content.fileUrl.startsWith("https://"))
      ? policy.content.fileUrl
      : null;
  return (
    <PublicLayout schoolName={result.data.school.name}>
      <article className="page-hero">
        <div className="site-container page-hero-inner page-content">
          <h1>{policy.title}</h1>
          {typeof policy.content.summary === "string" && <p>{policy.content.summary}</p>}
          <ContentBody content={policy.content} />
          {fileUrl && (
            <p>
              <a
                className="button"
                href={fileUrl}
                rel={fileUrl.startsWith("https://") ? "noreferrer" : undefined}
                target={fileUrl.startsWith("https://") ? "_blank" : undefined}
              >
                View policy document
              </a>
            </p>
          )}
        </div>
      </article>
    </PublicLayout>
  );
}
