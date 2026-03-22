import { PageFrame } from "@/components/PageFrame";
import { EmptyState } from "@/components/EmptyState";
import { SectionBlock } from "@/components/SectionBlock";
import { listBriefs } from "@/features/brief/use-case/list-briefs";
import { BriefCard } from "@/features/brief/view/BriefCard";

export default async function BriefPage() {
  const briefs = await listBriefs();

  return (
    <PageFrame>
      <SectionBlock eyebrow="브리프" title="AI 뉴스 한국어 브리프 아카이브">
        {briefs.length === 0 ? (
          <EmptyState
            body="새로운 브리프가 발행되면 여기에 표시됩니다."
            title="아직 발행된 브리프가 없습니다"
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
