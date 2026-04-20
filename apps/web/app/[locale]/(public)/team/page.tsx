import type { Metadata } from "next";

import { PageFrame } from "@/components/PageFrame";
import { SectionBlock } from "@/components/SectionBlock";
import { SITE_URL } from "@/lib/constants";
import { buildAlternates, getLocaleFromParams, getOgLocale } from "@/lib/i18n";
import { getPublicPageRobots } from "@/lib/review-window";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  return {
    title: "Team",
    description:
      "Meet the team responsible for VibeHub editorial judgment, source curation, and publication standards.",
    robots: getPublicPageRobots("team"),
    alternates: {
      canonical: `${SITE_URL}/${locale}/team`,
      languages: buildAlternates("/team", SITE_URL),
    },
    openGraph: { locale: getOgLocale(locale) },
  };
}

export default function TeamPage() {
  return (
    <PageFrame>
      <SectionBlock eyebrow="Trust" title="Who publishes VibeHub">
        <article className="brief-reading-col stack-tight">
          <p>
            VibeHub is published by a small editorial operation focused on readable AI news briefs,
            source-linked summaries, and practical industry context for builders and operators.
          </p>

          <h3>Editorial ownership</h3>
          <p>
            Public copy is owned at the organization level by VibeHub. We currently use an
            organization byline rather than individual author pages so that the editorial standard
            stays consistent while the publisher surface is still being hardened.
          </p>

          <h3>What the team is responsible for</h3>
          <p>
            The team decides which sources are trusted, which drafts are too thin to publish, how
            briefs are rewritten, and when corrections or holds are necessary. Automation supports
            intake, but it does not replace editorial responsibility.
          </p>

          <h3>How review works</h3>
          <p>
            Every public brief must clear source, clarity, and reader-value checks. Thin summaries,
            internal workflow language, artifact-heavy copy, and low-quality cover images are held
            back for cleanup instead of being promoted as finished editorial.
          </p>

          <h3>Why organization-level authorship</h3>
          <p>
            We have not launched real person-level author pages yet, so we avoid inventing
            individual author identity signals. Until that system exists, VibeHub appears publicly
            as the accountable publisher of record.
          </p>
        </article>
      </SectionBlock>
    </PageFrame>
  );
}
