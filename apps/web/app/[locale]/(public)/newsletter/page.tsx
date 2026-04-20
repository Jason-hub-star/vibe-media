import type { Metadata } from "next";

import { SITE_URL } from "@/lib/constants";
import { getLocaleFromParams, buildAlternates, getOgLocale } from "@/lib/i18n";
import { getPublicPageRobots } from "@/lib/review-window";
import { PageFrame } from "@/components/PageFrame";
import { PlaceholderArt } from "@/components/PlaceholderArt";
import { SectionBlock } from "@/components/SectionBlock";
import { NewsletterForm } from "@/features/newsletter/view/NewsletterForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  return {
    title: "Newsletter",
    description: "Get weekly AI brief digests delivered to your inbox.",
    robots: getPublicPageRobots("newsletter"),
    alternates: {
      canonical: `${SITE_URL}/${locale}/newsletter`,
      languages: buildAlternates("/newsletter", SITE_URL),
    },
    openGraph: { locale: getOgLocale(locale) },
  };
}

export default async function NewsletterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await getLocaleFromParams(params);
  return (
    <PageFrame>
      <SectionBlock eyebrow="Subscription" title="Stay updated when a brief is worth your time">
        <div className="hero-grid">
          <NewsletterForm locale={locale} />
          <PlaceholderArt
            alt="Newsletter hero placeholder"
            src="/placeholders/newsletter-hero-placeholder.png"
          />
        </div>
      </SectionBlock>
    </PageFrame>
  );
}
