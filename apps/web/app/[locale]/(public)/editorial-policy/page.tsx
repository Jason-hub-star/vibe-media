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
    title: "Editorial Policy",
    description:
      "How VibeHub selects sources, rewrites briefs, handles corrections, and separates editorial judgment from monetization.",
    robots: getPublicPageRobots("editorial-policy"),
    alternates: {
      canonical: `${SITE_URL}/${locale}/editorial-policy`,
      languages: buildAlternates("/editorial-policy", SITE_URL),
    },
    openGraph: { locale: getOgLocale(locale) },
  };
}

export default function EditorialPolicyPage() {
  return (
    <PageFrame>
      <SectionBlock eyebrow="Trust" title="Editorial Policy">
        <article className="brief-reading-col stack-tight">
          <p className="muted">Last updated: April 2026</p>

          <h3>1. Source selection</h3>
          <p>
            We prioritize primary announcements, original reporting, and credible industry coverage.
            Briefs should rely on at least two trustworthy sources whenever possible, with the
            original source linked first.
          </p>

          <h3>2. Rewrite standard</h3>
          <p>
            VibeHub briefs are rewritten for readers, not copied from feeds. We remove boilerplate,
            marketing language, player UI text, alt-text artifacts, and internal production notes
            before anything is considered publishable.
          </p>

          <h3>3. What we reject as low-value</h3>
          <p>
            We do not treat thin changelog bullets, glossary-style explainers, one-source press
            releases, or maintenance-note summaries as good public editorial unless they are paired
            with reader-facing synthesis and corroboration.
          </p>

          <h3>4. AI assistance disclosure</h3>
          <p>
            We use automation to collect candidates and prepare drafts, but public copy must pass
            editorial quality gates before publication. AI assistance does not exempt a brief from
            sourcing, clarity, or reader-value requirements.
          </p>

          <h3>5. Corrections policy</h3>
          <p>
            If we materially misstate a fact, we correct the public brief and update the editorial
            note for the record. Minor style cleanups may be made without a separate notice.
          </p>

          <h3>6. Ads and editorial separation</h3>
          <p>
            Editorial decisions are made before monetization decisions. We do not allow advertising
            placement or affiliate considerations to determine what gets published or how it is
            described.
          </p>
        </article>
      </SectionBlock>
    </PageFrame>
  );
}
