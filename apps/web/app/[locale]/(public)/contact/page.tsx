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
    title: "Contact",
    description:
      "Contact VibeHub for editorial questions, business inquiries, privacy requests, or legal notices.",
    robots: getPublicPageRobots("contact"),
    alternates: {
      canonical: `${SITE_URL}/${locale}/contact`,
      languages: buildAlternates("/contact", SITE_URL),
    },
    openGraph: { locale: getOgLocale(locale) },
  };
}

export default function ContactPage() {
  return (
    <PageFrame>
      <SectionBlock eyebrow="Trust" title="Contact VibeHub">
        <article className="brief-reading-col stack-tight">
          <p>
            Use the addresses below for the fastest routing. We generally respond to editorial and
            business messages within a few business days.
          </p>

          <h3>Editorial and general contact</h3>
          <p>
            <a className="inline-link" href="mailto:contact@vibehub.tech">
              contact@vibehub.tech
            </a>
          </p>

          <h3>Business inquiries</h3>
          <p>
            Partnerships, publisher questions, and commercial conversations can be sent to{" "}
            <a className="inline-link" href="mailto:business@vibehub.tech">
              business@vibehub.tech
            </a>
            .
          </p>

          <h3>Privacy requests</h3>
          <p>
            Data and privacy questions can be sent to{" "}
            <a className="inline-link" href="mailto:privacy@vibehub.tech">
              privacy@vibehub.tech
            </a>
            .
          </p>

          <h3>Legal notices</h3>
          <p>
            Terms-related or legal notices can be sent to{" "}
            <a className="inline-link" href="mailto:legal@vibehub.tech">
              legal@vibehub.tech
            </a>
            .
          </p>
        </article>
      </SectionBlock>
    </PageFrame>
  );
}
