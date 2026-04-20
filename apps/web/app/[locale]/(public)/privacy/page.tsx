import type { Metadata } from "next";

import { SITE_URL } from "@/lib/constants";
import { getLocaleFromParams, buildAlternates, getOgLocale } from "@/lib/i18n";
import { getPublicPageRobots } from "@/lib/review-window";
import { PageFrame } from "@/components/PageFrame";
import { SectionBlock } from "@/components/SectionBlock";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  return {
    title: "Privacy Policy",
    description: "VibeHub privacy policy — how we collect, use, and protect your data.",
    robots: getPublicPageRobots("privacy"),
    alternates: {
      canonical: `${SITE_URL}/${locale}/privacy`,
      languages: buildAlternates("/privacy", SITE_URL),
    },
    openGraph: { locale: getOgLocale(locale) },
  };
}

export default function PrivacyPage() {
  return (
    <PageFrame>
      <SectionBlock eyebrow="Legal" title="Privacy Policy">
        <article className="brief-reading-col stack-tight">
          <p className="muted">Last updated: March 2026</p>

          <h3>1. Information We Collect</h3>
          <p>
            We collect your email address when you subscribe to the VibeHub newsletter.
            We also collect anonymous usage data through analytics to improve our service.
          </p>

          <h3>2. How We Use Your Information</h3>
          <p>
            Your email is used solely to deliver newsletter updates. Analytics data helps us
            understand which content resonates and improve the reading experience.
          </p>

          <h3>3. Data Sharing</h3>
          <p>
            We do not sell, trade, or share your personal information with third parties,
            except as required by law or to deliver the services you have requested.
          </p>

          <h3>4. Cookies</h3>
          <p>
            We use essential cookies and analytics cookies. You can disable cookies in your
            browser settings, though some features may not function properly.
          </p>

          <h3>5. Data Retention</h3>
          <p>
            Newsletter subscriptions remain active until you unsubscribe. You can unsubscribe
            at any time using the link in any newsletter email.
          </p>

          <h3>6. Contact</h3>
          <p>
            For privacy-related questions, contact us at privacy@vibehub.tech.
          </p>
        </article>
      </SectionBlock>
    </PageFrame>
  );
}
