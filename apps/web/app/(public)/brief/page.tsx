import type { Metadata } from "next";
import Link from "next/link";

import { SITE_URL } from "@/lib/constants";
import { PageFrame } from "@/components/PageFrame";

export const metadata: Metadata = {
  title: "AI Briefs Archive",
  description:
    "Browse all published AI briefs with quality scores and source tracking.",
  alternates: { canonical: `${SITE_URL}/brief` }
};
import { SectionBlock } from "@/components/SectionBlock";
import { listBriefs } from "@/features/brief/use-case/list-briefs";
import { BriefCard } from "@/features/brief/view/BriefCard";
import { BriefPlaceholderCard } from "@/features/brief/view/BriefPlaceholderCard";

const MIN_VISIBLE_CARDS = 6;

export default async function BriefPage() {
  const briefs = await listBriefs();
  const placeholderCount = Math.max(0, MIN_VISIBLE_CARDS - briefs.length);

  return (
    <PageFrame>
      <SectionBlock eyebrow="Briefs" title="AI news brief archive">
        <p className="muted">
          We curate global AI sources every day and distill them into concise, actionable briefs.
        </p>

        <div className="brief-grid">
          {briefs.map((brief, i) => (
            <BriefCard brief={brief} isLead={i === 0} key={brief.slug} />
          ))}
          {Array.from({ length: placeholderCount }, (_, i) => (
            <BriefPlaceholderCard key={`ph-${i}`} index={i} />
          ))}
        </div>

        {briefs.length === 0 && (
          <div className="brief-cta-banner">
            <p>Our editorial pipeline is running — the first published briefs will appear here soon.</p>
            <Link className="button-secondary" href="/radar">
              Explore Radar while you wait
            </Link>
          </div>
        )}
      </SectionBlock>
    </PageFrame>
  );
}
