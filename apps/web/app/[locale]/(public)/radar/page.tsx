import type { Metadata } from "next";

import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/constants";
import { getLocaleFromParams, buildAlternates, getOgLocale } from "@/lib/i18n";
import { getPublicPageRobots } from "@/lib/review-window";
import { PageFrame } from "@/components/PageFrame";
import { PlaceholderArt } from "@/components/PlaceholderArt";
import { SectionBlock } from "@/components/SectionBlock";
import { listDiscoverItems } from "@/features/discover/use-case/list-discover-items";
import { DiscoverListWithFilter } from "@/features/discover/view/DiscoverListWithFilter";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  return {
    title: "Radar — AI Discovery Hub",
    description:
      "Track emerging AI tools, design references, research, and trends across 25 categories.",
    robots: getPublicPageRobots("radar-list"),
    alternates: {
      canonical: `${SITE_URL}/${locale}/radar`,
      languages: buildAlternates("/radar", SITE_URL),
    },
    openGraph: { locale: getOgLocale(locale) },
  };
}

export default async function RadarPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await getLocaleFromParams(params);
  const items = await listDiscoverItems();
  const canonical = `${SITE_URL}/${locale}/radar`;

  return (
    <PageFrame>
      {items.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "VibeHub Radar Discovery Index",
            inLanguage: locale,
            url: canonical,
            numberOfItems: items.length,
            itemListElement: items.map((item, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: item.title,
              url: `${SITE_URL}/${locale}/radar/${item.id}`,
            })),
          }}
        />
      )}
      <section className="shell hero-grid">
        <div className="stack-tight">
          <p className="eyebrow">Radar</p>
          <h1>One place to spot tools, design references, events, and launches worth acting on.</h1>
          <p className="muted">
            A discovery hub for open-source projects, plugins, design-token inspiration, events, contests, and trending sites — browse and jump straight in.
          </p>
        </div>
        <PlaceholderArt alt="Radar hero placeholder" src="/placeholders/radar-hero-placeholder.png" />
      </section>

      <SectionBlock eyebrow="Radar" title="Browse by category or search across all items">
        <DiscoverListWithFilter items={items} locale={locale} />
      </SectionBlock>
    </PageFrame>
  );
}
