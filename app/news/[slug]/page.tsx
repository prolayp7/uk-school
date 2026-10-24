import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { CmsImage, ContentBody, PageIntro } from "@/components/content-renderer";
import { PublicLayout } from "@/components/public-layout";
import { PublicState } from "@/components/public-state";
import { getPublicData } from "@/lib/api/client";
import type { PublicCollection } from "@/lib/api/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicData<PublicCollection>("/website/news", 100);
  if (result.error) return {};
  const item = result.data.items.find((entry) => entry.slug === slug);
  if (!item) return {};
  return {
    title: item.seo.title ?? item.title,
    description: item.seo.description ?? (
      typeof item.content.summary === "string" ? item.content.summary : undefined
    ),
  };
}

export default async function NewsItemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
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
  const item = result.data.items.find((entry) => entry.slug === slug);
  if (!item) notFound();
  return (
    <PublicLayout schoolName={result.data.school.name}>
      <article>
        <section className="page-hero">
          <div className="site-container page-hero-inner page-content">
            <PageIntro page={item} />
          </div>
        </section>
        <section className="section section-paper">
          <div className="site-container page-content">
            {typeof item.content.imageUrl === "string" && (
              <CmsImage
                alt=""
                className="article-image"
                url={item.content.imageUrl}
              />
            )}
            {typeof item.content.summary === "string" && <p className="article-summary">{item.content.summary}</p>}
            <ContentBody content={item.content} />
            <p className="back-link">
              <Link href="/news">Back to news</Link>
            </p>
          </div>
        </section>
      </article>
    </PublicLayout>
  );
}
