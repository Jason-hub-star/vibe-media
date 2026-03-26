import type { Metadata } from "next";

import { SITE_URL } from "@/lib/constants";
import { EmptyState } from "@/components/EmptyState";
import { PageFrame } from "@/components/PageFrame";
import { PlaceholderArt } from "@/components/PlaceholderArt";
import { SectionBlock } from "@/components/SectionBlock";
import { listDiscoverItems } from "@/features/discover/use-case/list-discover-items";
import { DiscoverCard } from "@/features/discover/view/DiscoverCard";
import { DiscoverListWithFilter } from "@/features/discover/view/DiscoverListWithFilter";
import { listShowcaseEntries } from "@/features/showcase/use-case/list-showcase-entries";
import { ShowcaseCard } from "@/features/showcase/view/ShowcaseCard";
import { isPublishedShowcaseEntry } from "@vibehub/backend";

export const metadata: Metadata = {
  title: "Radar — AI Discovery Hub",
  description:
    "Track emerging AI tools, research, and trends across 24 categories.",
  alternates: { canonical: `${SITE_URL}/radar` }
};

export default async function RadarPage() {
  const items = await listDiscoverItems();
  const showcaseEntries = await listShowcaseEntries();
  const featured = items.filter((item) => item.highlighted);
  const rest = items.filter((item) => !item.highlighted);
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
        title="Handpicked vibe coding work, curated separately from the discovery index"
      >
        {showcasePicks.length === 0 ? (
          <EmptyState
            body="Curated showcase picks will appear here once the first items are selected."
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

      <SectionBlock eyebrow="Discovery index" title="Browse by category group or search across all items">
        <DiscoverListWithFilter items={rest} />
      </SectionBlock>
    </PageFrame>
  );
}
