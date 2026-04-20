import type { Metadata } from "next";

import { SITE_URL } from "@/lib/constants";
import {
  buildAlternates,
  getLocaleFromParams,
  getOgLocale,
} from "@/lib/i18n";
import { getPublicPageRobots } from "@/lib/review-window";
import { PageFrame } from "@/components/PageFrame";
import { PlaceholderArt } from "@/components/PlaceholderArt";
import { SectionBlock } from "@/components/SectionBlock";
import { listShowcasePicksForSubmitHub } from "@/features/showcase/use-case/list-showcase-picks-for-submit-hub";
import { ShowcaseCard } from "@/features/showcase/view/ShowcaseCard";
import { listImportedToolCandidatesForListing } from "@/features/tool-candidate-imports/use-case/list-imported-tool-candidates-for-listing";
import { ToolCandidateImportCard } from "@/features/tool-candidate-imports/view/ToolCandidateImportCard";
import { listLatestToolSubmissions } from "@/features/tool-submissions/use-case/list-latest-tool-submissions";
import { ToolSubmissionCard } from "@/features/tool-submissions/view/ToolSubmissionCard";
import { ToolSubmissionFormWithPreview } from "@/features/tool-submissions/view/ToolSubmissionFormWithPreview";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  return {
    title: "Submit a Tool",
    description:
      "Share your tool with a fast, no-login form and get screened for VibeHub listings and Showcase Picks.",
    robots: getPublicPageRobots("sources"),
    alternates: {
      canonical: `${SITE_URL}/${locale}/sources`,
      languages: buildAlternates("/sources", SITE_URL),
    },
    openGraph: { locale: getOgLocale(locale) },
  };
}

export default async function SourcesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await getLocaleFromParams(params);
  const [showcasePicks, latestSubmissions, importedCandidates] = await Promise.all([
    listShowcasePicksForSubmitHub(),
    listLatestToolSubmissions(),
    listImportedToolCandidatesForListing(),
  ]);

  return (
    <PageFrame>
      <section className="shell hero-grid">
        <div className="stack-tight">
          <p className="eyebrow">Submit Tool</p>
          <h1>Share your tool without a login wall.</h1>
          <p className="muted">
            Start with the basics, submit in a minute, and let us handle the first
            screening pass. Strong fits can surface in Latest Submissions and may
            later be handpicked for Showcase Picks.
          </p>
          <div className="button-row">
            <a className="button-primary" href="#submit-tool">
              Submit your tool
            </a>
            {latestSubmissions.length > 0 && (
              <a className="button-secondary" href="#latest-submissions">
                Browse latest submissions
              </a>
            )}
            {importedCandidates.length > 0 && (
              <a className="button-secondary" href="#imported-candidates">
                Browse imported candidates
              </a>
            )}
          </div>
        </div>
        <PlaceholderArt
          alt="Submit tool hero placeholder"
          src="/placeholders/source-strip-placeholder.jpg"
        />
      </section>

      {showcasePicks.length > 0 && (
        <SectionBlock
          eyebrow="Showcase picks"
          title="Operator-curated tools we think deserve a closer look"
        >
          <div className="showcase-grid">
            {showcasePicks.map((entry) => (
              <ShowcaseCard entry={entry} key={entry.id} />
            ))}
          </div>
        </SectionBlock>
      )}

      <SectionBlock
        eyebrow="Submit your tool"
        sectionId="submit-tool"
        title="Quick intake built for busy builders"
      >
        <p className="muted">
          During our review window, the core indexed surface stays focused on briefs and trust
          pages. Tool intake remains open here for direct visitors.
        </p>
        <ToolSubmissionFormWithPreview />
      </SectionBlock>

      {latestSubmissions.length > 0 && (
        <SectionBlock
          eyebrow="Latest submissions"
          sectionId="latest-submissions"
          title="Fresh tools that passed automated screening"
        >
          <div className="submission-card-grid">
            {latestSubmissions.map((item) => (
              <ToolSubmissionCard item={item} key={item.id} />
            ))}
          </div>
        </SectionBlock>
      )}

      {importedCandidates.length > 0 && (
        <SectionBlock
          eyebrow="Imported candidates"
          sectionId="imported-candidates"
          title="Projects spotted on trusted public sources"
        >
          <div className="submission-card-grid">
            {importedCandidates.map((item) => (
              <ToolCandidateImportCard item={item} key={item.id} />
            ))}
          </div>
        </SectionBlock>
      )}
    </PageFrame>
  );
}
