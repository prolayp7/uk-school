import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CmsImage, ContentBody, PageIntro } from "@/components/content-renderer";
import { PublicLayout } from "@/components/public-layout";
import { PublicState } from "@/components/public-state";
import { getPublicData } from "@/lib/api/client";
import type { PublicPageResponse } from "@/lib/api/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return value;
  if (value.startsWith("https://")) return value;
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicData<PublicPageResponse>(
    `/website/pages/${encodeURIComponent(slug)}`,
  );
  if (result.error) return {};
  return {
    title: result.data.page.seo.title ?? result.data.page.title,
    description: result.data.page.seo.description ?? undefined,
  };
}

export default async function CmsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getPublicData<PublicPageResponse>(
    `/website/pages/${encodeURIComponent(slug)}`,
  );

  if (result.error?.status === 404) notFound();
  if (result.error) {
    return (
      <PublicLayout schoolName="School website">
        <div className="site-container section">
          <PublicState kind="error" message={result.error.message} title="Page unavailable" />
        </div>
      </PublicLayout>
    );
  }

  const { school, page } = result.data;
  const imageUrl = safeHref(page.content.heroImageUrl);
  const cta =
    isRecord(page.content.primaryCta) ? page.content.primaryCta : null;
  const ctaUrl = safeHref(cta?.url);
  return (
    <PublicLayout schoolName={school.name}>
      <section className="page-hero">
        <div className="site-container page-hero-inner">
          {imageUrl && (
            <CmsImage
              alt=""
              className="page-hero-image"
              priority
              url={imageUrl}
            />
          )}
          <PageIntro page={page} />
        </div>
      </section>
      <section className="section section-paper">
        <div className="site-container page-content">
          <ContentBody content={page.content} />
          {typeof cta?.label === "string" &&
            ctaUrl && (
              <p>
                <a
                  className="button"
                  href={ctaUrl}
                  rel={ctaUrl.startsWith("https://") ? "noreferrer" : undefined}
                  target={ctaUrl.startsWith("https://") ? "_blank" : undefined}
                >
                  {cta.label}
                </a>
              </p>
            )}
        </div>
      </section>
    </PublicLayout>
  );
}
