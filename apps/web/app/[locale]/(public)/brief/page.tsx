import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/constants";
import { getLocaleFromParams, buildAlternates, getOgLocale } from "@/lib/i18n";
import { getPublicPageRobots, isPublicReviewWindowEnabled, sortBriefsForReviewWindow } from "@/lib/review-window";
import { PageFrame } from "@/components/PageFrame";
import { SectionBlock } from "@/components/SectionBlock";
import { listBriefs } from "@/features/brief/use-case/list-briefs";
import { BriefListWithFilter } from "@/features/brief/view/BriefListWithFilter";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  return {
    title: "AI Briefs Archive",
    description:
      "Browse all published AI briefs with source attribution.",
    robots: getPublicPageRobots("brief-list"),
    alternates: {
      canonical: `${SITE_URL}/${locale}/brief`,
      languages: buildAlternates("/brief", SITE_URL),
    },
    openGraph: { locale: getOgLocale(locale) },
  };
}

export default async function BriefPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await getLocaleFromParams(params);
  const rawBriefs = await listBriefs();
  const seen = new Set<string>();
  const briefs = rawBriefs.filter((brief) => {
    if (seen.has(brief.slug)) return false;
    seen.add(brief.slug);
    return true;
  });
  const rankedBriefs = sortBriefsForReviewWindow(briefs);
  const canonical = `${SITE_URL}/${locale}/brief`;
  const reviewWindowActive = isPublicReviewWindowEnabled();

  return (
    <PageFrame>
      {rankedBriefs.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "VibeHub Brief Archive",
            inLanguage: locale,
            url: canonical,
            numberOfItems: rankedBriefs.length,
            itemListOrder: "https://schema.org/ItemListOrderDescending",
            itemListElement: rankedBriefs.map((brief, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: brief.title,
              url: `${SITE_URL}/${locale}/brief/${brief.slug}`,
            })),
          }}
        />
      )}
      <SectionBlock eyebrow="Briefs" title="AI news brief archive">
        <p className="muted">
          We curate global AI sources every day and distill them into concise, actionable briefs.
        </p>
        {reviewWindowActive && (
          <p className="muted">
            Review window is active. Stronger editorial briefs appear first while weaker archive
            entries remain accessible for ongoing cleanup.
          </p>
        )}

        {rankedBriefs.length === 0 ? (
          <div className="brief-cta-banner">
            <p>We are preparing the first briefs — published stories will appear here soon.</p>
            <Link className="button-secondary" href={`/${locale}/radar`}>
              Explore Radar while you wait
            </Link>
          </div>
        ) : (
          <BriefListWithFilter briefs={rankedBriefs} locale={locale} />
        )}
      </SectionBlock>
    </PageFrame>
  );
}
