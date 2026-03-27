import type { Metadata } from "next";

import { SITE_URL } from "@/lib/constants";
import { getLocaleFromParams, buildAlternates, getOgLocale } from "@/lib/i18n";
import { PageFrame } from "@/components/PageFrame";
import { SectionBlock } from "@/components/SectionBlock";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  return {
    title: "Terms of Service",
    description: "VibeHub terms of service — rules and guidelines for using our platform.",
    alternates: {
      canonical: `${SITE_URL}/${locale}/terms`,
      languages: buildAlternates("/terms", SITE_URL),
    },
    openGraph: { locale: getOgLocale(locale) },
  };
}

export default function TermsPage() {
  return (
    <PageFrame>
      <SectionBlock eyebrow="Legal" title="Terms of Service">
        <article className="brief-reading-col stack-tight">
          <p className="muted">Last updated: March 2026</p>

          <h3>1. Acceptance of Terms</h3>
          <p>
            By accessing VibeHub, you agree to these terms. If you do not agree,
            please do not use the service.
          </p>

          <h3>2. Description of Service</h3>
          <p>
            VibeHub provides curated AI news briefs, a discovery radar for tools and
            resources, and a newsletter service. Content is sourced from publicly available
            feeds and reviewed by our editorial team.
          </p>

          <h3>3. Intellectual Property</h3>
          <p>
            Original brief content, design, and curation are owned by VibeHub. Source
            articles remain the property of their respective publishers and are linked
            with attribution.
          </p>

          <h3>4. User Conduct</h3>
          <p>
            You agree not to use automated tools to scrape content beyond what is provided
            via our RSS feeds, or to misrepresent VibeHub content as your own.
          </p>

          <h3>5. Disclaimer</h3>
          <p>
            Content is provided for informational purposes only. We make no warranties
            about the accuracy or completeness of any information on this site.
          </p>

          <h3>6. Changes to Terms</h3>
          <p>
            We may update these terms from time to time. Continued use of the service
            after changes constitutes acceptance of the new terms.
          </p>

          <h3>7. Contact</h3>
          <p>
            For questions about these terms, contact us at legal@vibehub.tech.
          </p>
        </article>
      </SectionBlock>
    </PageFrame>
  );
}
