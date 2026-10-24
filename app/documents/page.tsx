import { PublicLayout } from "@/components/public-layout";
import { PublicState } from "@/components/public-state";
import { getPublicData } from "@/lib/api/client";
import type { PublicCollection } from "@/lib/api/types";

export const metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const result = await getPublicData<PublicCollection>("/website/documents", 100);
  if (result.error) {
    return (
      <PublicLayout schoolName="School website">
        <div className="site-container section">
          <PublicState kind="error" message={result.error.message} title="Documents are unavailable" />
        </div>
      </PublicLayout>
    );
  }
  return (
    <PublicLayout schoolName={result.data.school.name}>
      <section className="page-hero">
        <div className="site-container page-hero-inner">
          <h1>Documents</h1>
          <p>Documents published by the school.</p>
        </div>
      </section>
      <section className="section">
        <div className="site-container">
          {result.data.items.length === 0 ? (
            <PublicState message="There are no public documents to show." title="No documents published" />
          ) : (
            <div className="document-grid">
              {result.data.items.map((document) => {
                const fileUrl =
                  typeof document.content.fileUrl === "string" &&
                  (document.content.fileUrl.startsWith("/") ||
                    document.content.fileUrl.startsWith("https://"))
                    ? document.content.fileUrl
                    : null;
                return (
                  <article className="document-item" key={document.slug}>
                    <div>
                      <strong>{document.title}</strong>
                      {typeof document.content.summary === "string" && (
                        <p>{document.content.summary}</p>
                      )}
                    </div>
                    {fileUrl && (
                      <a
                        className="link-arrow"
                        href={fileUrl}
                        rel={fileUrl.startsWith("https://") ? "noreferrer" : undefined}
                        target={fileUrl.startsWith("https://") ? "_blank" : undefined}
                      >
                        Open
                      </a>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
