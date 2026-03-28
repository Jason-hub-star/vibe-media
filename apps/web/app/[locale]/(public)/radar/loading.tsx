import { PageFrame } from "@/components/PageFrame";
import { SectionBlock } from "@/components/SectionBlock";

function DiscoverSkeletonCard() {
  return (
    <article className="panel stack-tight" aria-hidden="true">
      <div className="row-between">
        <span className="skeleton-line" style={{ width: "5rem" }} />
        <span className="skeleton-line" style={{ width: "4rem" }} />
      </div>
      <div className="skeleton-block" style={{ width: "75%" }} />
      <div className="skeleton-line" />
      <div className="skeleton-line" />
    </article>
  );
}

export default function RadarLoading() {
  return (
    <PageFrame>
      <SectionBlock eyebrow="Radar" title="AI Discovery Radar">
        <div className="panel-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <DiscoverSkeletonCard key={i} />
          ))}
        </div>
      </SectionBlock>
    </PageFrame>
  );
}
