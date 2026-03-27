import type { Metadata } from "next";
import Link from "next/link";

import { SITE_URL } from "@/lib/constants";
import { getLocaleFromParams, buildAlternates, getOgLocale } from "@/lib/i18n";
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
  const briefs = await listBriefs();

  return (
    <PageFrame>
      <SectionBlock eyebrow="Briefs" title="AI news brief archive">
        <p className="muted">
          We curate global AI sources every day and distill them into concise, actionable briefs.
        </p>

        {briefs.length === 0 ? (
          <div className="brief-cta-banner">
            <p>We are preparing the first briefs — published stories will appear here soon.</p>
            <Link className="button-secondary" href={`/${locale}/radar`}>
              Explore Radar while you wait
            </Link>
          </div>
        ) : (
          <BriefListWithFilter briefs={briefs} locale={locale} />
        )}
      </SectionBlock>
    </PageFrame>
  );
}
