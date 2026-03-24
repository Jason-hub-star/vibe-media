import { PageFrame } from "@/components/PageFrame";
import { SectionBlock } from "@/components/SectionBlock";
import { BriefSkeletonCard } from "@/features/brief/view/BriefSkeletonCard";

export default function BriefLoading() {
  return (
    <PageFrame>
      <SectionBlock eyebrow="Briefs" title="AI news brief archive">
        <div className="brief-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <BriefSkeletonCard key={i} />
          ))}
        </div>
      </SectionBlock>
    </PageFrame>
  );
}
