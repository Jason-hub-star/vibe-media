import type { Metadata } from "next";

import { SITE_URL } from "@/lib/constants";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = {
  title: "Radar — AI Discovery Hub",
  description:
    "Track emerging AI tools, research, and trends across 24 categories.",
  alternates: { canonical: `${SITE_URL}/radar` }
};
import { PageFrame } from "@/components/PageFrame";
import { PlaceholderArt } from "@/components/PlaceholderArt";
import { SectionBlock } from "@/components/SectionBlock";
import { listDiscoverItems } from "@/features/discover/use-case/list-discover-items";
import { DiscoverCard } from "@/features/discover/view/DiscoverCard";
import { presentDiscoverCategory, groupByCategory } from "@/features/discover/presenter/present-discover-category";
import { listShowcaseEntries } from "@/features/showcase/use-case/list-showcase-entries";
import { ShowcaseCard } from "@/features/showcase/view/ShowcaseCard";
import { isPublishedShowcaseEntry } from "@vibehub/backend";

export default async function RadarPage() {
  const items = await listDiscoverItems();
  const showcaseEntries = await listShowcaseEntries();
  const featured = items.filter((item) => item.highlighted);
  const rest = items.filter((item) => !item.highlighted);
  const grouped = groupByCategory(rest);
  const showcasePicks = showcaseEntries.filter(
    (entry) => entry.featuredRadar && isPublishedShowcaseEntry(entry)
  );

  return (
    <PageFrame>
      <section className="shell hero-grid">
        <div className="stack-tight">
          <p className="eyebrow">Radar</p>
          <h1>One place to spot tools, skills, events, and launches worth acting on.</h1>
          <p className="muted">
            A discovery hub for open-source projects, plugins, events, contests, and trending sites — browse and jump straight in.
          </p>
        </div>
        <PlaceholderArt alt="Radar hero placeholder" src="/placeholders/radar-hero-placeholder.svg" />
      </section>

      <SectionBlock
        eyebrow="Showcase picks"
        sectionId="showcase-picks"
        title="Curated vibe coding work in a sidecar lane, not mixed into the auto pipeline"
      >
        {showcasePicks.length === 0 ? (
          <EmptyState
            body="Manual showcase curation will surface here without changing the discovery automation spine."
            title="No showcase picks yet"
          />
        ) : (
          <div className="showcase-grid">
            {showcasePicks.map((entry) => (
              <ShowcaseCard entry={entry} key={entry.id} />
            ))}
          </div>
        )}
      </SectionBlock>

      <SectionBlock eyebrow="Featured picks" title="Fast paths into things worth opening, downloading, or tracking">
        {featured.length === 0 ? (
          <EmptyState
            body="Pinned resources will appear here after the first curation pass."
            title="No featured picks yet"
          />
        ) : (
          <div className="panel-grid">
            {featured.map((item) => (
              <DiscoverCard item={item} key={item.id} />
            ))}
          </div>
        )}
      </SectionBlock>

      {grouped.size === 0 ? (
        <SectionBlock eyebrow="Discovery index" title="Extensible categories for the next curation wave">
          <EmptyState
            body="Tracked resources will show up here after sources and curation rules are connected."
            title="No discovery items yet"
          />
        </SectionBlock>
      ) : (
        Array.from(grouped.entries()).map(([category, categoryItems]) => {
          const cat = presentDiscoverCategory(category);
          return (
            <SectionBlock
              key={category}
              eyebrow={`${cat.icon} ${cat.label}`}
              sectionId={`category-${category}`}
              title={`${categoryItems.length} item${categoryItems.length > 1 ? "s" : ""} in ${cat.groupLabel}`}
            >
              <div className="panel-grid">
                {categoryItems.map((item) => (
                  <DiscoverCard item={item} key={item.id} />
                ))}
              </div>
            </SectionBlock>
          );
        })
      )}
    </PageFrame>
  );
}
