import Link from "next/link";
import Image from "next/image";

import { PageFrame } from "@/components/PageFrame";
import { PlaceholderArt } from "@/components/PlaceholderArt";
import { SectionBlock } from "@/components/SectionBlock";
import { BriefCard } from "@/features/brief/view/BriefCard";
import { listBriefs } from "@/features/brief/use-case/list-briefs";
import { listShowcaseEntries } from "@/features/showcase/use-case/list-showcase-entries";
import { ShowcaseCard } from "@/features/showcase/view/ShowcaseCard";
import { isPublishedShowcaseEntry } from "@vibehub/backend";

export default async function HomePage() {
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
          <h1>AI 뉴스를 빠르게, 한국어 브리프로.</h1>
          <p className="muted">
            글로벌 AI 소스를 매일 정리해 핵심만 전달합니다.
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
              <p className="eyebrow">매일 업데이트</p>
              <p>글로벌 AI 뉴스를 매일 선별해 한국어 브리프로 발행합니다.</p>
            </article>
            <article className="panel stack-tight">
              <p className="eyebrow">출처 투명 공개</p>
              <p>모든 브리프에 원문 링크와 출처를 함께 제공합니다.</p>
            </article>
            <article className="panel stack-tight">
              <p className="eyebrow">오픈소스·이벤트 발견</p>
              <p>새로운 도구, 이벤트, 오픈소스 프로젝트를 Radar에서 탐색하세요.</p>
            </article>
            <article className="panel stack-tight">
              <p className="eyebrow">빠른 액션 링크</p>
              <p>GitHub, 공식 문서, 다운로드로 바로 이동할 수 있습니다.</p>
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

      <SectionBlock eyebrow="Showcase lane" title="Vibe coding work that sits beside the brief engine">
        {homeShowcase.length === 0 ? (
          <article className="panel stack-tight">
            <p className="eyebrow">Sidecar lane</p>
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
            작품 전시는 자동 뉴스 파이프라인이 아니라 별도 sidecar lane으로 운영해, briefs와 radar의 본선 의미를 흐리지 않습니다.
          </p>
          <div className="button-row">
            <Link className="button-secondary" href="/radar#showcase-picks">
              View showcase picks
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
