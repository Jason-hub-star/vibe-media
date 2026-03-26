import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/JsonLd";
import { PageFrame } from "@/components/PageFrame";
import { SectionBlock } from "@/components/SectionBlock";
import { getAdjacentBriefs } from "@/features/brief/use-case/get-adjacent-briefs";
import { getBriefDetail } from "@/features/brief/use-case/get-brief-detail";
import { BriefBodySections } from "@/features/brief/view/BriefBodySections";
import { BriefInsight } from "@/features/brief/view/BriefInsight";
import { BriefMetaBar } from "@/features/brief/view/BriefMetaBar";
import { BriefNav } from "@/features/brief/view/BriefNav";
import { BriefShareBar } from "@/features/brief/view/BriefShareBar";
import { BriefSourcePanel } from "@/features/brief/view/BriefSourcePanel";
import { presentRelativeDate } from "@/features/shared/presenter/present-relative-date";
import { SITE_URL } from "@/lib/constants";

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const brief = await getBriefDetail(slug);
  if (!brief) return { title: "Brief not found" };

  const canonical = `${SITE_URL}/brief/${slug}`;
  return {
    title: brief.title,
    description: brief.summary,
    openGraph: {
      type: "article",
      title: brief.title,
      description: brief.summary,
      url: canonical,
      ...(brief.coverImage ? { images: [brief.coverImage] } : {}),
      ...(brief.publishedAt
        ? { publishedTime: brief.publishedAt }
        : {})
    },
    twitter: {
      card: "summary_large_image",
      title: brief.title,
      description: brief.summary,
      ...(brief.coverImage ? { images: [brief.coverImage] } : {})
    },
    alternates: { canonical }
  };
}

export default async function BriefDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [brief, adjacent] = await Promise.all([
    getBriefDetail(slug),
    getAdjacentBriefs(slug)
  ]);

  if (!brief) {
    notFound();
  }

  const eyebrow = brief.publishedAt
    ? presentRelativeDate(brief.publishedAt)
    : "Brief";

  const canonical = `${SITE_URL}/brief/${slug}`;

  return (
    <PageFrame>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          headline: brief.title,
          description: brief.summary,
          url: canonical,
          ...(brief.coverImage ? { image: brief.coverImage } : {}),
          ...(brief.publishedAt
            ? { datePublished: brief.publishedAt }
            : {}),
          author: { "@type": "Organization", name: "VibeHub" },
          publisher: {
            "@type": "Organization",
            name: "VibeHub",
            logo: {
              "@type": "ImageObject",
              url: `${SITE_URL}/brand/logo-mark.svg`
            }
          }
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: SITE_URL
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Briefs",
              item: `${SITE_URL}/brief`
            },
            {
              "@type": "ListItem",
              position: 3,
              name: brief.title,
              item: canonical
            }
          ]
        }}
      />
      <SectionBlock eyebrow={eyebrow} title={brief.title}>
        <div className="brief-reading-col">
          <BriefMetaBar
            topic={brief.topic}
            readTimeMinutes={brief.readTimeMinutes}
            sourceCount={brief.sourceCount}
          />

          {brief.coverImage && (
            <div className="brief-cover">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={brief.coverImage}
                alt=""
                className="brief-cover-img"
              />
            </div>
          )}

          <p className="brief-dek">{brief.summary}</p>

          {brief.whyItMatters && <BriefInsight text={brief.whyItMatters} />}

          <article className="brief-detail-article stack-tight">
            <BriefBodySections body={brief.body} />
          </article>

          <BriefShareBar slug={slug} title={brief.title} />
          <BriefSourcePanel sourceLinks={brief.sourceLinks} />
          <BriefNav prev={adjacent.prev} next={adjacent.next} />
        </div>
      </SectionBlock>
    </PageFrame>
  );
}
