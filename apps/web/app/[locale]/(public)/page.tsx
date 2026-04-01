import type { Metadata } from "next";
import Link from "next/link";

import { SITE_URL } from "@/lib/constants";
import { getLocaleFromParams, buildAlternates, getOgLocale } from "@/lib/i18n";

import { PageFrame } from "@/components/PageFrame";
import { SectionBlock } from "@/components/SectionBlock";
import { BriefCard } from "@/features/brief/view/BriefCard";
import { listBriefs } from "@/features/brief/use-case/list-briefs";
import { listShowcaseEntries } from "@/features/showcase/use-case/list-showcase-entries";
import { ShowcaseCard } from "@/features/showcase/view/ShowcaseCard";
import { NewsletterForm } from "@/features/newsletter/view/NewsletterForm";
import { isPublishedShowcaseEntry } from "@vibehub/backend";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  return {
    title: "VibeHub — Daily AI Briefs",
    description:
      "Briefs, source links, and tool discovery in one place.",
    alternates: {
      canonical: `${SITE_URL}/${locale}`,
      languages: buildAlternates("", SITE_URL),
    },
    openGraph: { locale: getOgLocale(locale) },
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await getLocaleFromParams(params);
  const rawBriefs = await listBriefs();
  const seen = new Set<string>();
  const briefs = rawBriefs.filter((b) => {
    if (seen.has(b.slug)) return false;
    seen.add(b.slug);
    return true;
  });
  const latestVideoBrief = briefs
    .filter((brief) => Boolean(brief.youtubeUrl && brief.youtubeLinkedAt))
    .sort((a, b) => {
      const left = new Date(a.youtubeLinkedAt ?? 0).getTime();
      const right = new Date(b.youtubeLinkedAt ?? 0).getTime();
      return right - left;
    })[0];
  const showcaseEntries = await listShowcaseEntries();
  const homeShowcase = showcaseEntries.filter(
    (entry) => entry.featuredHome && isPublishedShowcaseEntry(entry)
  );

  return (
    <PageFrame>
      <section className="shell hero-grid">
        <div className="hero-copy-full stack-tight">
          <p className="eyebrow">AI Brief Hub</p>
          <h1>Your daily AI brief, curated from 30+ sources.</h1>
          <p className="muted">
            Briefs, source links, and tool discovery in one place.
          </p>
          <div className="button-row">
            <Link className="button-primary" href={`/${locale}/brief`}>
              Browse briefs
            </Link>
            <Link className="button-secondary" href={`/${locale}/sources`}>
              Submit tool
            </Link>
            <Link className="button-secondary" href={`/${locale}/radar`}>
              Explore radar
            </Link>
          </div>
        </div>
      </section>

      {latestVideoBrief && latestVideoBrief.youtubeUrl && (
        <SectionBlock eyebrow="Latest video" title="Latest Video Brief">
          <article className="panel stack-tight">
            <p className="eyebrow">Connected brief</p>
            <h3>{latestVideoBrief.title}</h3>
            <p className="muted">{latestVideoBrief.summary}</p>
            <div className="button-row">
              <Link
                className="button-primary"
                href={latestVideoBrief.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Watch on YouTube
              </Link>
              <Link
                className="button-secondary"
                href={`/${locale}/brief/${latestVideoBrief.slug}`}
              >
                Read the brief
              </Link>
            </div>
          </article>
        </SectionBlock>
      )}

      <SectionBlock eyebrow="Selected briefs" title="Latest AI Briefs">
        <div className="brief-grid">
          {briefs.map((brief, i) => (
            <BriefCard brief={brief} isLead={i === 0} key={brief.slug} locale={locale} />
          ))}
        </div>
      </SectionBlock>

      <SectionBlock eyebrow="Stay updated" title="Get briefs in your inbox">
        <NewsletterForm locale={locale} />
      </SectionBlock>

      {homeShowcase.length > 0 && (
        <SectionBlock
          eyebrow="Showcase lane"
          sectionId="showcase-lane"
          title="Handpicked vibe coding work"
        >
          <div className="showcase-grid">
            {homeShowcase.slice(0, 2).map((entry) => (
              <ShowcaseCard entry={entry} key={entry.id} />
            ))}
          </div>
        </SectionBlock>
      )}

      <SectionBlock eyebrow="Discovery surface" title="AI Discovery Radar">
        <div className="summary-grid">
          <article className="panel stack-tight">
            <p className="eyebrow">Open source</p>
            <p>Track repos, docs, downloads, and hand-picked references in one place.</p>
          </article>
          <article className="panel stack-tight">
            <p className="eyebrow">Skills</p>
            <p>Surface reusable coding skills and jump straight to installation or docs.</p>
          </article>
          <article className="panel stack-tight">
            <p className="eyebrow">Events</p>
            <p>Keep conferences, launches, and contests visible without burying them inside briefs.</p>
          </article>
          <article className="panel stack-tight">
            <p className="eyebrow">Actions</p>
            <p>Every discovery item is designed to support quick visit, docs, GitHub, or apply actions.</p>
          </article>
        </div>
      </SectionBlock>
    </PageFrame>
  );
}
