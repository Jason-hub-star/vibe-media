import { PageFrame } from "@/components/PageFrame";
import { EmptyState } from "@/components/EmptyState";
import { SectionBlock } from "@/components/SectionBlock";
import { listBriefs } from "@/features/brief/use-case/list-briefs";
import { BriefCard } from "@/features/brief/view/BriefCard";

export default async function BriefPage() {
  const briefs = await listBriefs();

  return (
    <PageFrame>
      <SectionBlock eyebrow="Briefs" title="AI news brief archive">
        {briefs.length === 0 ? (
          <EmptyState
            body="Published briefs will appear here once available."
            title="No briefs published yet"
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
