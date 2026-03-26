import type { Metadata } from "next";

import { SITE_URL } from "@/lib/constants";
import { PageFrame } from "@/components/PageFrame";

export const metadata: Metadata = {
  title: "Newsletter",
  description: "Get weekly AI brief digests delivered to your inbox.",
  alternates: { canonical: `${SITE_URL}/newsletter` }
};
import { PlaceholderArt } from "@/components/PlaceholderArt";
import { SectionBlock } from "@/components/SectionBlock";
import { NewsletterForm } from "@/features/newsletter/view/NewsletterForm";

export default function NewsletterPage() {
  return (
    <PageFrame>
      <SectionBlock eyebrow="Subscription" title="Stay updated when a brief is worth your time">
        <div className="hero-grid">
          <NewsletterForm />
          <PlaceholderArt
            alt="Newsletter hero placeholder"
            src="/placeholders/newsletter-hero-placeholder.svg"
          />
        </div>
      </SectionBlock>
    </PageFrame>
  );
}
