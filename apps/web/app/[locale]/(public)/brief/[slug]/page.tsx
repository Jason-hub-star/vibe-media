import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { AdSlot } from "@/components/AdSlot";
import { JsonLd } from "@/components/JsonLd";
import { PageFrame } from "@/components/PageFrame";
import { SectionBlock } from "@/components/SectionBlock";
import { TranslationPendingBanner } from "@/components/TranslationPendingBanner";
import { getBriefVariant } from "@/features/brief/api/get-brief-variant";
import { getAdjacentBriefs } from "@/features/brief/use-case/get-adjacent-briefs";
import { getBriefDetail } from "@/features/brief/use-case/get-brief-detail";
import { listBriefs } from "@/features/brief/use-case/list-briefs";
import { RelatedBriefs } from "@/features/brief/view/RelatedBriefs";
import { BriefBodySections } from "@/features/brief/view/BriefBodySections";
import { BriefInsight } from "@/features/brief/view/BriefInsight";
import { BriefMetaBar } from "@/features/brief/view/BriefMetaBar";
import { BriefNav } from "@/features/brief/view/BriefNav";
import { BriefScrollTracker } from "@/features/brief/view/BriefScrollTracker";
import { BriefShareBar } from "@/features/brief/view/BriefShareBar";
import { BriefSourcePanel } from "@/features/brief/view/BriefSourcePanel";
import { presentRelativeDate } from "@/features/shared/presenter/present-relative-date";
import { SITE_URL } from "@/lib/constants";
import { getLocaleFromParams, buildAlternates, getOgLocale } from "@/lib/i18n";
import { getPublicBriefRobots } from "@/lib/review-window";

const BRIEF_AD_SLOT = process.env.NEXT_PUBLIC_ADSENSE_BRIEF_SLOT?.trim();

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocaleFromParams(params);
  const brief = await getBriefDetail(slug);
  if (!brief) return { title: "Brief not found" };

  // variant가 있으면 메타데이터도 번역 버전 사용
  const variant = locale !== "en" ? await getBriefVariant(slug, locale) : null;
  const title = variant?.title ?? brief.title;
  const summary = variant?.summary ?? brief.summary;

  const canonical = `${SITE_URL}/${locale}/brief/${slug}`;
  return {
    title,
    description: summary,
    robots: getPublicBriefRobots({
      ...brief,
      bodyPreview: brief.body.join(" ").slice(0, 320),
    }),
    openGraph: {
      type: "article",
      title,
      description: summary,
      url: canonical,
      locale: getOgLocale(locale),
      ...(brief.coverImage ? { images: [brief.coverImage] } : {}),
      ...(brief.publishedAt ? { publishedTime: brief.publishedAt } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: summary,
      ...(brief.coverImage ? { images: [brief.coverImage] } : {}),
    },
    alternates: {
      canonical,
      languages: buildAlternates(`/brief/${slug}`, SITE_URL),
    },
  };
}

export default async function BriefDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocaleFromParams(params);
  const [brief, adjacent, allBriefs] = await Promise.all([
    getBriefDetail(slug),
    getAdjacentBriefs(slug),
    listBriefs(),
  ]);

  if (!brief) notFound();

  // locale variant 조회 — variant가 없으면 영어 원문 + fallback 배너
  const isCanonicalLocale = locale === (brief.canonicalLocale ?? "en");
  const variant = isCanonicalLocale ? null : await getBriefVariant(slug, locale);
  const showFallbackBanner = !isCanonicalLocale && !variant;

  // variant가 있으면 번역 콘텐츠 사용, 없으면 영어 원문
  const displayTitle = variant?.title ?? brief.title;
  const displaySummary = variant?.summary ?? brief.summary;
  const displayBody = variant?.body ?? brief.body;

  const eyebrow = brief.publishedAt
    ? presentRelativeDate(brief.publishedAt)
    : "Brief";

  const canonical = `${SITE_URL}/${locale}/brief/${slug}`;
  const youtubeEmbedUrl = brief.youtubeVideoId
    ? `https://www.youtube.com/embed/${brief.youtubeVideoId}`
    : null;

  return (
    <PageFrame>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          headline: displayTitle,
          description: displaySummary,
          url: canonical,
          inLanguage: locale,
          ...(brief.coverImage ? { image: brief.coverImage } : {}),
          ...(brief.publishedAt ? { datePublished: brief.publishedAt } : {}),
          author: { "@type": "Organization", name: "VibeHub" },
          publisher: {
            "@type": "Organization",
            name: "VibeHub",
            logo: {
              "@type": "ImageObject",
              url: `${SITE_URL}/brand/logo-mark.svg`,
            },
          },
        }}
      />
      {brief.youtubeUrl && youtubeEmbedUrl && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "VideoObject",
            name: displayTitle,
            description: displaySummary,
            url: brief.youtubeUrl,
            embedUrl: youtubeEmbedUrl,
            ...(brief.coverImage ? { thumbnailUrl: [brief.coverImage] } : {}),
            ...(brief.youtubeLinkedAt ?? brief.publishedAt
              ? { uploadDate: brief.youtubeLinkedAt ?? brief.publishedAt }
              : {}),
          }}
        />
      )}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: `${SITE_URL}/${locale}`,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Briefs",
              item: `${SITE_URL}/${locale}/brief`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: brief.title,
              item: canonical,
            },
          ],
        }}
      />
      <SectionBlock eyebrow={eyebrow} title={displayTitle}>
        <div className="brief-reading-col">
          <BriefScrollTracker slug={slug} locale={locale} />
          {showFallbackBanner && <TranslationPendingBanner locale={locale} />}

          <BriefMetaBar
            topic={brief.topic}
            readTimeMinutes={brief.readTimeMinutes}
            sourceCount={brief.sourceCount}
          />

          {brief.coverImage && (
            <div className="brief-cover">
              <Image
                src={brief.coverImage}
                alt={displayTitle}
                fill
                sizes="(max-width: 768px) 100vw, 680px"
                unoptimized
                className="brief-cover-img"
              />
            </div>
          )}

          <p className="brief-dek">{displaySummary}</p>

          {brief.whyItMatters && <BriefInsight text={brief.whyItMatters} />}

          {brief.youtubeUrl && (
            <section className="panel stack-tight brief-video-callout">
              <p className="eyebrow">Watch</p>
              <h3>Watch this brief on YouTube</h3>
              <p className="muted">
                Prefer the video version? This brief now has a connected YouTube upload.
              </p>
              <div className="button-row">
                <a
                  className="button-primary"
                  href={brief.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Watch on YouTube
                </a>
              </div>
              {youtubeEmbedUrl && (
                <div className="brief-video-frame">
                  <iframe
                    src={youtubeEmbedUrl}
                    title={`${displayTitle} — YouTube video`}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              )}
            </section>
          )}

          <article className="brief-detail-article stack-tight">
            <BriefBodySections body={displayBody} />
          </article>

          {BRIEF_AD_SLOT && (
            <AdSlot className="panel stack-tight" slot={BRIEF_AD_SLOT} />
          )}

          <BriefShareBar slug={slug} title={displayTitle} locale={locale} />
          <BriefSourcePanel sourceLinks={brief.sourceLinks} />
          <BriefNav prev={adjacent.prev} next={adjacent.next} locale={locale} />
        </div>
      </SectionBlock>

      {brief.topic && (
        <SectionBlock eyebrow="Related" title="More on this topic">
          <RelatedBriefs
            currentSlug={slug}
            topic={brief.topic}
            briefs={allBriefs}
            locale={locale}
          />
        </SectionBlock>
      )}
    </PageFrame>
  );
}
