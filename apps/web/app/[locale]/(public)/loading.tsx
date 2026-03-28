import { PageFrame } from "@/components/PageFrame";
import { SectionBlock } from "@/components/SectionBlock";
import { BriefSkeletonCard } from "@/features/brief/view/BriefSkeletonCard";

export default function PublicLoading() {
  return (
    <PageFrame>
      <section className="shell hero-grid">
        <div className="hero-copy-full stack-tight" aria-hidden="true">
          <span className="skeleton-line" style={{ width: "6rem" }} />
          <div className="skeleton-block" style={{ width: "70%", height: "2rem" }} />
          <span className="skeleton-line" style={{ width: "50%" }} />
        </div>
      </section>

      <SectionBlock eyebrow="Selected briefs" title="Latest AI Briefs">
        <div className="brief-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <BriefSkeletonCard key={i} />
          ))}
        </div>
      </SectionBlock>
    </PageFrame>
  );
}
