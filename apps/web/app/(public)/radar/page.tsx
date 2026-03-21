import { EmptyState } from "@/components/EmptyState";
import { PageFrame } from "@/components/PageFrame";
import { PlaceholderArt } from "@/components/PlaceholderArt";
import { SectionBlock } from "@/components/SectionBlock";
import { listDiscoverItems } from "@/features/discover/use-case/list-discover-items";
import { DiscoverCard } from "@/features/discover/view/DiscoverCard";

export default function RadarPage() {
  const items = listDiscoverItems();
  const featured = items.filter((item) => item.highlighted);

  return (
    <PageFrame>
      <section className="shell hero-grid">
        <div className="stack-tight">
          <p className="eyebrow">Radar</p>
          <h1>One place to spot tools, skills, events, and launches worth acting on.</h1>
          <p className="muted">
            오픈소스, 플러그인, 행사, 공모전, 뜨는 웹사이트를 빠르게 보고 바로 이동할 수 있는 발견 허브입니다.
          </p>
        </div>
        <PlaceholderArt alt="Radar hero placeholder" src="/placeholders/radar-hero-placeholder.svg" />
      </section>

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

      <SectionBlock eyebrow="Discovery index" title="Extensible categories for the next curation wave">
        {items.length === 0 ? (
          <EmptyState
            body="Tracked resources will show up here after sources and curation rules are connected."
            title="No discovery items yet"
          />
        ) : (
          <div className="panel-grid">
            {items.map((item) => (
              <DiscoverCard item={item} key={item.id} />
            ))}
          </div>
        )}
      </SectionBlock>
    </PageFrame>
  );
}
