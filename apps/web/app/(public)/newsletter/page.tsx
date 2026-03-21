import { PageFrame } from "@/components/PageFrame";
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
