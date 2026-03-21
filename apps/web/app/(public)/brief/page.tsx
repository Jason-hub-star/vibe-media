import { PageFrame } from "@/components/PageFrame";
import { EmptyState } from "@/components/EmptyState";
import { SectionBlock } from "@/components/SectionBlock";
import { listBriefs } from "@/features/brief/use-case/list-briefs";
import { BriefCard } from "@/features/brief/view/BriefCard";

export default function BriefPage() {
  const briefs = listBriefs();

  return (
    <PageFrame>
      <SectionBlock eyebrow="Archive" title="AI briefs prepared for review or publication">
        {briefs.length === 0 ? (
          <EmptyState
            body="Brief cards will appear here once the drafting pipeline has something worth reviewing."
            title="No briefs yet"
          />
        ) : (
          <div className="panel-grid">
            {briefs.map((brief) => (
              <BriefCard brief={brief} key={brief.slug} />
            ))}
          </div>
        )}
      </SectionBlock>
    </PageFrame>
  );
}
