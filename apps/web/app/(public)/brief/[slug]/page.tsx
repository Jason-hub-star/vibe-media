import { notFound } from "next/navigation";

import { PageFrame } from "@/components/PageFrame";
import { SectionBlock } from "@/components/SectionBlock";
import { getAdjacentBriefs } from "@/features/brief/use-case/get-adjacent-briefs";
import { getBriefDetail } from "@/features/brief/use-case/get-brief-detail";
import { BriefBodySections } from "@/features/brief/view/BriefBodySections";
import { BriefInsight } from "@/features/brief/view/BriefInsight";
import { BriefMetaBar } from "@/features/brief/view/BriefMetaBar";
import { BriefNav } from "@/features/brief/view/BriefNav";
import { BriefSourcePanel } from "@/features/brief/view/BriefSourcePanel";
import { presentRelativeDate } from "@/features/shared/presenter/present-relative-date";

export default async function BriefDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [brief, adjacent] = await Promise.all([
    getBriefDetail(slug),
    getAdjacentBriefs(slug)
  ]);

  if (!brief) {
    notFound();
  }

  const eyebrow = brief.publishedAt
    ? presentRelativeDate(brief.publishedAt)
    : "Brief";

  return (
    <PageFrame>
      <SectionBlock eyebrow={eyebrow} title={brief.title}>
        <BriefMetaBar
          topic={brief.topic}
          readTimeMinutes={brief.readTimeMinutes}
          sourceCount={brief.sourceCount}
        />

        {brief.coverImage && (
          <div className="brief-cover">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={brief.coverImage}
              alt=""
              className="brief-cover-img"
            />
          </div>
        )}

        <article className="brief-detail-article panel stack-tight">
          <p className="muted">{brief.summary}</p>
          <BriefBodySections body={brief.body} />
          {brief.whyItMatters && <BriefInsight text={brief.whyItMatters} />}
        </article>

        <BriefSourcePanel sourceLinks={brief.sourceLinks} />
        <BriefNav prev={adjacent.prev} next={adjacent.next} />
      </SectionBlock>
    </PageFrame>
  );
}
