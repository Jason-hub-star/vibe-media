import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

import { SITE_URL } from "@/lib/constants";
import { getLocaleFromParams, buildAlternates, getOgLocale } from "@/lib/i18n";

import { PageFrame } from "@/components/PageFrame";
import { PlaceholderArt } from "@/components/PlaceholderArt";
import { SectionBlock } from "@/components/SectionBlock";
import { BriefCard } from "@/features/brief/view/BriefCard";
import { listBriefs } from "@/features/brief/use-case/list-briefs";
import { listShowcaseEntries } from "@/features/showcase/use-case/list-showcase-entries";
import { ShowcaseCard } from "@/features/showcase/view/ShowcaseCard";
import { isPublishedShowcaseEntry } from "@vibehub/backend";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  return {
    title: "VibeHub — Daily AI Briefs",
    description:
      "Curated AI news briefs from verified global sources, published daily.",
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
  const briefs = await listBriefs();
  const showcaseEntries = await listShowcaseEntries();
  const homeShowcase = showcaseEntries.filter(
    (entry) => entry.featuredHome && isPublishedShowcaseEntry(entry)
  );

  return (
    <PageFrame>
      <section className="shell hero-grid">
        <div className="stack-tight">
          <p className="eyebrow">AI Brief Hub</p>
          <h1>AI news, distilled into daily briefs.</h1>
          <p className="muted">
            We curate global AI sources every day and deliver only what matters.
          </p>
          <div className="button-row">
            <Link className="button-primary" href={`/${locale}/brief`}>
              Browse briefs
            </Link>
            <Link className="button-secondary" href={`/${locale}/radar`}>
              Explore radar
            </Link>
            <Link className="button-secondary" href={`/${locale}/sources`}>
              Submit tool
            </Link>
          </div>
          <div className="panel-grid">
            <article className="panel stack-tight">
              <p className="eyebrow">Daily updates</p>
              <p>We handpick global AI news and publish concise briefs every day.</p>
            </article>
            <article className="panel stack-tight">
              <p className="eyebrow">Transparent sources</p>
              <p>Every brief includes original links and source attribution.</p>
            </article>
            <article className="panel stack-tight">
              <p className="eyebrow">Discover tools &amp; events</p>
              <p>Explore new tools, events, and open-source projects on Radar.</p>
            </article>
            <article className="panel stack-tight">
              <p className="eyebrow">Quick action links</p>
              <p>Jump straight to GitHub, official docs, or downloads.</p>
            </article>
          </div>
        </div>
        <PlaceholderArt alt="Brief hero placeholder" src="/placeholders/brief-hero-placeholder.svg" />
      </section>

      <SectionBlock eyebrow="Selected briefs" title="Recent explainers with operational context">
        <div className="panel-grid">
          {briefs.map((brief) => (
            <BriefCard brief={brief} key={brief.slug} locale={locale} />
          ))}
        </div>
      </SectionBlock>

      <SectionBlock
        eyebrow="Showcase lane"
        sectionId="showcase-lane"
        title="Handpicked vibe coding work, curated separately from briefs"
      >
        {homeShowcase.length === 0 ? (
          <article className="panel stack-tight">
            <p className="eyebrow">Showcase</p>
            <p className="muted">
              Showcase picks will appear here after the first manual curation pass.
            </p>
          </article>
        ) : (
          <div className="showcase-grid">
            {homeShowcase.slice(0, 2).map((entry) => (
              <ShowcaseCard entry={entry} key={entry.id} />
            ))}
          </div>
        )}
        <article className="panel stack-tight">
          <p className="eyebrow">Why it fits</p>
          <p className="muted">
            Showcase is curated independently — each pick is chosen by hand, separate from daily briefs and radar items.
          </p>
          <div className="button-row">
            <Link className="button-secondary" href={`/${locale}/#showcase-lane`}>
              Jump to showcase
            </Link>
          </div>
        </article>
      </SectionBlock>

      <SectionBlock eyebrow="Custom assets" title="Brand-led visuals, not generic AI website gloss">
        <div className="panel-grid">
          <article className="panel stack-tight">
            <Image alt="Logo ribbon" height={48} src="/brand/ribbon.svg" width={220} />
            <p className="muted">Logo, ribbon, and section markers are first-class assets in the system.</p>
          </article>
          <article className="panel stack-tight">
            <Image alt="Orbit sprite" height={84} src="/sprites/orbit-grid.svg" width={84} />
            <p className="muted">Sprites and utility graphics keep the UI intentional without AI-art clutter.</p>
          </article>
          <article className="panel stack-tight">
            <Image alt="Source strip" height={200} src="/placeholders/source-strip-placeholder.svg" width={300} />
            <p className="muted">Content image slots stay explicit so generated assets can be swapped cleanly later.</p>
          </article>
        </div>
      </SectionBlock>

      <SectionBlock eyebrow="Discovery surface" title="A growing index for tools, events, and opportunities across the AI landscape">
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
