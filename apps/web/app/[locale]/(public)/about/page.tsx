import type { Metadata } from "next";

import { SITE_URL } from "@/lib/constants";
import { getLocaleFromParams, buildAlternates, getOgLocale } from "@/lib/i18n";
import { PageFrame } from "@/components/PageFrame";
import { SectionBlock } from "@/components/SectionBlock";
import { NewsletterForm } from "@/features/newsletter/view/NewsletterForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  return {
    title: "About",
    description:
      "VibeHub delivers daily AI briefs curated from global sources — only what matters, every day.",
    alternates: {
      canonical: `${SITE_URL}/${locale}/about`,
      languages: buildAlternates("/about", SITE_URL),
    },
    openGraph: { locale: getOgLocale(locale) },
  };
}

export default function AboutPage() {
  return (
    <PageFrame>
      <SectionBlock eyebrow="About" title="AI news, distilled into daily briefs.">
        <div className="brief-reading-col stack-tight">
          <p>
            There is too much AI news and it is scattered everywhere.
            VibeHub exists to fix that — we curate global sources every day
            and deliver only what is worth your time.
          </p>

          <h3>What we do</h3>
          <p>
            Every day, we scan trusted sources across the AI ecosystem —
            research labs, developer blogs, open-source repositories, and
            industry publications. We distill the signal from the noise and
            publish concise, actionable briefs.
          </p>

          <h3>Brief</h3>
          <p>
            Each brief covers a single topic with context, analysis, and
            source links. No fluff, no clickbait — just the facts and why
            they matter.
          </p>

          <h3>Radar</h3>
          <p>
            Our discovery hub tracks emerging tools, open-source projects,
            events, and opportunities across multiple categories. Browse,
            filter, and jump straight to what interests you.
          </p>

          <h3>Get in touch</h3>
          <p>
            Questions, feedback, or partnership inquiries — reach us at{" "}
            <a href="mailto:contact@vibehub.tech" className="inline-link">
              contact@vibehub.tech
            </a>
          </p>
        </div>
      </SectionBlock>

      <SectionBlock eyebrow="Stay updated" title="Get briefs delivered to your inbox">
        <div className="hero-grid">
          <NewsletterForm />
        </div>
      </SectionBlock>
    </PageFrame>
  );
}
