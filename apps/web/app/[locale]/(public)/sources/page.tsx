import type { Metadata } from "next";

import { SITE_URL } from "@/lib/constants";
import {
  buildAlternates,
  getLocaleFromParams,
  getOgLocale,
} from "@/lib/i18n";
import { PageFrame } from "@/components/PageFrame";
import { PlaceholderArt } from "@/components/PlaceholderArt";
import { SectionBlock } from "@/components/SectionBlock";
import { listShowcasePicksForSubmitHub } from "@/features/showcase/use-case/list-showcase-picks-for-submit-hub";
import { ShowcaseCard } from "@/features/showcase/view/ShowcaseCard";
import { listImportedToolCandidatesForListing } from "@/features/tool-candidate-imports/use-case/list-imported-tool-candidates-for-listing";
import { ToolCandidateImportCard } from "@/features/tool-candidate-imports/view/ToolCandidateImportCard";
import { listLatestToolSubmissions } from "@/features/tool-submissions/use-case/list-latest-tool-submissions";
import { ToolSubmissionCard } from "@/features/tool-submissions/view/ToolSubmissionCard";
import { ToolSubmissionForm } from "@/features/tool-submissions/view/ToolSubmissionForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  return {
    title: "Submit Tool",
    description:
      "Submit your tool, get through automated screening, and earn a spot in VibeHub Showcase Picks.",
    alternates: {
      canonical: `${SITE_URL}/${locale}/sources`,
      languages: buildAlternates("/sources", SITE_URL),
    },
    openGraph: { locale: getOgLocale(locale) },
  };
}

export default async function SourcesPage() {
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
          <h1>Share your tool, pass automated screening, and earn a curated spotlight.</h1>
          <p className="muted">
            Showcase Picks are operator-curated. Latest Submissions highlights new
            tools that passed our first automated screening pass. Imported
            Candidates is a separate lane for tools spotted on trusted public
            sources.
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
        title="Fast intake, no login wall"
      >
        <div className="hero-grid submit-tool-grid">
          <ToolSubmissionForm />
          <article className="panel stack-tight">
            <p className="eyebrow">How it works</p>
            <h3>Four lanes, four different promises.</h3>
            <p className="muted">
              Showcase Picks is curated by operators. Submit Your Tool is the
              intake lane. Latest Submissions only shows tools that pass automated
              screening. Imported Candidates tracks trusted-source finds with
              preserved attribution.
            </p>
            <div className="stack-tight">
              <p>Required: title, summary, website URL, submitter email.</p>
              <p>Optional: GitHub, demo, docs, extra tags, submitter name.</p>
              <p>
                Screening checks URLs, duplicates, basic spam patterns, and public
                site reachability.
              </p>
              <p>
                Imported Candidates is a separate lane for trusted-source finds and
                never pretends those tools were submitted directly by their builders.
              </p>
            </div>
          </article>
        </div>
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
