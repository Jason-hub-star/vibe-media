import Link from "next/link";
import Image from "next/image";

import { PageFrame } from "@/components/PageFrame";
import { PlaceholderArt } from "@/components/PlaceholderArt";
import { SectionBlock } from "@/components/SectionBlock";
import { BriefCard } from "@/features/brief/view/BriefCard";
import { listBriefs } from "@/features/brief/use-case/list-briefs";

export default function HomePage() {
  const briefs = listBriefs();

  return (
    <PageFrame>
      <section className="shell hero-grid">
        <div className="stack-tight">
          <p className="eyebrow">AI brief hub</p>
          <h1>Operator-first AI publishing hub for VibeHub.</h1>
          <p className="muted">
            최신 AI 소스를 한국어 브리프로 정리하고, 운영 툴은 별도 admin cockpit에서 관리합니다.
          </p>
          <div className="button-row">
            <Link className="button-primary" href="/brief">
              Browse briefs
            </Link>
            <Link className="button-secondary" href="/radar">
              Explore radar
            </Link>
            <Link className="button-secondary" href="/sources">
              Inspect sources
            </Link>
          </div>
          <div className="panel-grid">
            <article className="panel stack-tight">
              <p className="eyebrow">Structure</p>
              <p>Expedition-style shell refined for editorial clarity.</p>
            </article>
            <article className="panel stack-tight">
              <p className="eyebrow">Assets</p>
              <p>Every image slot starts as a named placeholder for later replacement.</p>
            </article>
            <article className="panel stack-tight">
              <p className="eyebrow">Admin</p>
              <p>Video jobs live behind admin, not in the public navigation.</p>
            </article>
            <article className="panel stack-tight">
              <p className="eyebrow">Radar</p>
              <p>Open source, skills, events, and tool launches can expand into a public discovery layer.</p>
            </article>
          </div>
        </div>
        <PlaceholderArt alt="Brief hero placeholder" src="/placeholders/brief-hero-placeholder.svg" />
      </section>

      <SectionBlock eyebrow="Selected briefs" title="Recent explainers with operational context">
        <div className="panel-grid">
          {briefs.map((brief) => (
            <BriefCard brief={brief} key={brief.slug} />
          ))}
        </div>
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

      <SectionBlock eyebrow="Discovery surface" title="A growing index for tools, events, and opportunities around the brief engine">
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
