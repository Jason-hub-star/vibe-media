import type {
  AssetSlot,
  BriefDetail,
  DiscoverItem,
  ExceptionQueueItem,
  InboxItem,
  IngestRun,
  PublishQueueItem,
  ShowcaseEntry,
  SourceEntry
} from "@vibehub/content-contracts";
import { assetSlots } from "@vibehub/design-tokens";
import {
  deriveExceptionQueueEntries,
  derivePublishQueueEntriesFromInbox,
  deriveReviewEntriesFromInbox
} from "./pipeline-routing";
import { reviewEntries as reviewTemplates } from "./review-queue-mock";
import {
  deriveVideoExceptionQueueEntries,
  deriveVideoPublishQueueEntries,
  videoJobs
} from "./video-pipeline-mock";

export { videoJobs } from "./video-pipeline-mock";

export const briefDetails: BriefDetail[] = [
  {
    slug: "openai-agents-sdk-update",
    title: "OpenAI Agents SDK update",
    summary: "에이전트 구축 흐름에서 바뀐 점과 한국 제작자 관점의 의미를 정리합니다.",
    status: "review",
    publishedAt: null,
    sourceCount: 3,
    body: [
      "이번 브리프는 SDK의 구조 변화와 배포 운영 관점의 장단점을 빠르게 요약합니다.",
      "중요 포인트는 도구 결합 방식, 추적 가능성, 그리고 팀 생산성 향상입니다."
    ],
    sourceLinks: [
      { label: "OpenAI News", href: "https://openai.com/news/" },
      { label: "OpenAI Docs", href: "https://platform.openai.com/docs/" },
      { label: "Release Notes", href: "https://platform.openai.com/docs/changelog" }
    ]
  },
  {
    slug: "gemini-stitch-sdk-workflow",
    title: "Gemini + Stitch design workflow",
    summary: "시안 생성과 토큰 추출을 분리하는 운영 패턴을 정리합니다.",
    status: "published",
    publishedAt: "2026-03-21T09:00:00.000Z",
    sourceCount: 2,
    body: [
      "Stitch는 선택지를 넓히는 용도이고, 최종 UI의 소스 오브 트루스는 코드와 토큰입니다.",
      "이 분리는 디자인 일관성 유지와 테스트 가능성을 높입니다."
    ],
    sourceLinks: [
      { label: "Stitch SDK", href: "https://github.com/google-labs-code/stitch-sdk" },
      { label: "Impeccable", href: "https://github.com/pbakaus/impeccable" }
    ]
  }
];

export const sourceEntries: SourceEntry[] = [
  {
    id: "src-openai-news",
    label: "OpenAI News",
    category: "company",
    href: "https://openai.com/news/",
    freshness: "daily"
  },
  {
    id: "src-anthropic-research",
    label: "Anthropic Research",
    category: "research",
    href: "https://www.anthropic.com/research",
    freshness: "weekly"
  },
  {
    id: "src-google-release",
    label: "Google AI Blog",
    category: "release",
    href: "https://developers.googleblog.com/",
    freshness: "daily"
  }
];

export const inboxEntries: InboxItem[] = [
  {
    id: "inbox-openai-agents-sdk",
    sourceName: "OpenAI News",
    sourceTier: "auto-safe",
    title: "OpenAI Agents SDK update",
    contentType: "article",
    stage: "classified",
    targetSurface: "both",
    confidence: 0.94,
    parsedSummary: "OpenAI SDK 변경점이 brief와 discover를 동시에 만족할 가능성이 높은 항목입니다."
  },
  {
    id: "inbox-karpathy-interview",
    sourceName: "Transcript Mirror",
    sourceTier: "manual-review-required",
    title: "Andrej Karpathy on code agents and AutoResearch",
    contentType: "doc",
    stage: "parsed",
    targetSurface: "brief",
    confidence: 0.81,
    parsedSummary: "긴 인터뷰를 구조화했고, 직접 인용과 요약 경계를 한 번 더 검수해야 하는 상태입니다."
  },
  {
    id: "inbox-worlds-fair",
    sourceName: "AI Engineer World's Fair",
    sourceTier: "render-required",
    title: "AI Engineer World's Fair 2026",
    contentType: "event",
    stage: "drafted",
    targetSurface: "discover",
    confidence: 0.88,
    parsedSummary: "행사 페이지 링크, 일정, 빠른 액션 후보를 추출해 discover 레지스트리 진입 직전 상태입니다."
  },
  {
    id: "inbox-archive-research-note",
    sourceName: "Anthropic Research",
    sourceTier: "auto-safe",
    title: "Archived research note",
    contentType: "doc",
    stage: "classified",
    targetSurface: "archive",
    confidence: 0.9,
    parsedSummary: "참고 가치만 남기고 현재 surface에는 노출하지 않는 보관 항목입니다."
  },
  {
    id: "inbox-discard-duplicate",
    sourceName: "GitHub Release Mirror",
    sourceTier: "auto-safe",
    title: "Duplicate release mirror",
    contentType: "repo",
    stage: "classified",
    targetSurface: "discard",
    confidence: 0.97,
    parsedSummary: "기존 레이더 항목과 dedupe key가 겹쳐 폐기 대상으로 분류된 항목입니다."
  }
];

export const ingestRunEntries: IngestRun[] = [
  {
    id: "run-openai-0322-am",
    sourceName: "OpenAI News",
    runStatus: "classified",
    startedAt: "2026-03-22T07:30:00.000Z",
    finishedAt: "2026-03-22T07:34:00.000Z",
    itemCount: 4,
    errorMessage: null
  },
  {
    id: "run-karpathy-transcript",
    sourceName: "Transcript Mirror",
    runStatus: "review",
    startedAt: "2026-03-22T08:10:00.000Z",
    finishedAt: null,
    itemCount: 1,
    errorMessage: null
  },
  {
    id: "run-worlds-fair",
    sourceName: "AI Engineer World's Fair",
    runStatus: "failed",
    startedAt: "2026-03-22T12:30:00.000Z",
    finishedAt: "2026-03-22T12:32:00.000Z",
    itemCount: 0,
    errorMessage: "Render pass timed out before CTA links were extracted."
  }
];

export const reviewEntries = deriveReviewEntriesFromInbox(inboxEntries, reviewTemplates);

const basePublishQueueEntries = derivePublishQueueEntriesFromInbox(inboxEntries);

export const publishQueueEntries: PublishQueueItem[] = [
  ...basePublishQueueEntries,
  ...deriveVideoPublishQueueEntries(videoJobs)
];

const baseExceptionQueueEntries = deriveExceptionQueueEntries(
  inboxEntries,
  reviewTemplates,
  ingestRunEntries,
  deriveVideoExceptionQueueEntries(videoJobs)
);

export const exceptionQueueEntries: ExceptionQueueItem[] = baseExceptionQueueEntries;

export const discoverEntries: DiscoverItem[] = [
  {
    id: "discover-stitch-sdk",
    slug: "stitch-sdk",
    title: "Stitch SDK",
    category: "plugin",
    summary: "A design exploration tool for rapid variant generation and pattern extraction workflows.",
    status: "featured",
    reviewStatus: "approved",
    scheduledAt: null,
    publishedAt: "2026-03-22T09:00:00.000Z",
    tags: ["design", "sdk", "frontend"],
    highlighted: true,
    actions: [
      { kind: "github", label: "GitHub", href: "https://github.com/google-labs-code/stitch-sdk" },
      { kind: "docs", label: "Docs", href: "https://github.com/google-labs-code/stitch-sdk" }
    ]
  },
  {
    id: "discover-voltagent-subagents",
    slug: "awesome-codex-subagents",
    title: "Awesome Codex Subagents",
    category: "skill",
    summary: "A curated collection of subagent-based development workflow references in one place.",
    status: "tracked",
    reviewStatus: "approved",
    scheduledAt: null,
    publishedAt: "2026-03-22T09:10:00.000Z",
    tags: ["agents", "workflow", "skills"],
    highlighted: true,
    actions: [
      { kind: "github", label: "GitHub", href: "https://github.com/VoltAgent/awesome-codex-subagents" }
    ]
  },
  {
    id: "discover-ai-engineer-worlds-fair",
    slug: "ai-engineer-worlds-fair",
    title: "AI Engineer World's Fair",
    category: "event",
    summary: "The go-to conference for spotting talks, booths, and launches worth attending as a builder.",
    status: "watching",
    reviewStatus: "approved",
    scheduledAt: null,
    publishedAt: "2026-03-22T09:20:00.000Z",
    tags: ["event", "community", "products"],
    highlighted: false,
    actions: [
      { kind: "visit", label: "Site", href: "https://www.ai.engineer/" }
    ]
  },
  {
    id: "discover-openai-api",
    slug: "openai-api-platform",
    title: "OpenAI API Platform",
    category: "api",
    summary: "The unified entry point for model calls, agent development, and tool integrations.",
    status: "featured",
    reviewStatus: "approved",
    scheduledAt: null,
    publishedAt: "2026-03-22T09:30:00.000Z",
    tags: ["api", "models", "platform"],
    highlighted: true,
    actions: [
      { kind: "visit", label: "Platform", href: "https://platform.openai.com/" },
      { kind: "docs", label: "Docs", href: "https://platform.openai.com/docs/" }
    ]
  },
  {
    id: "discover-claude-code-subagents",
    slug: "claude-code-subagents",
    title: "Claude/Codex Subagent Workflows",
    category: "agent",
    summary: "Division-of-labor agent patterns tracked on the radar for pairing workflows.",
    status: "tracked",
    reviewStatus: "pending",
    scheduledAt: null,
    publishedAt: null,
    tags: ["agents", "workflow", "pairing"],
    highlighted: false,
    actions: [
      { kind: "github", label: "GitHub", href: "https://github.com/VoltAgent/awesome-codex-subagents" }
    ]
  },
  {
    id: "discover-mcp-guides",
    slug: "mcp-guides",
    title: "MCP Integration Guides",
    category: "integration",
    summary: "Guides for building tool connections and plugin bridges via MCP integrations.",
    status: "watching",
    reviewStatus: "pending",
    scheduledAt: null,
    publishedAt: null,
    tags: ["mcp", "integration", "plugins"],
    highlighted: false,
    actions: [
      { kind: "visit", label: "Guides", href: "https://modelcontextprotocol.io/" }
    ]
  }
];

export const showcaseEntries: ShowcaseEntry[] = [
  {
    id: "showcase-editorial-sidecar-lane",
    slug: "editorial-sidecar-lane",
    title: "Editorial Sidecar Lane",
    summary: "자동 뉴스 파이프라인을 건드리지 않고 전시 경험만 옆 레인으로 얹는 운영형 쇼케이스입니다.",
    body: [
      "이 전시는 brief/discover 자동화 본선을 유지한 채, 수동 큐레이션만 담는 별도 showcase 레인을 실험합니다.",
      "핵심은 홈 티저와 Radar 전시 묶음이 브랜드 감각을 더하되 파이프라인 의미를 흐리지 않는지 검증하는 것입니다."
    ],
    coverAsset: "/placeholders/source-strip-placeholder.svg",
    tags: ["showcase", "operations", "editorial"],
    primaryLink: {
      kind: "demo",
      label: "Read overview",
      href: "/radar#showcase-picks"
    },
    links: [
      {
        kind: "brief",
        label: "Related brief",
        href: "/brief/gemini-stitch-sdk-workflow"
      }
    ],
    reviewStatus: "approved",
    scheduledAt: null,
    publishedAt: "2026-03-22T09:00:00.000Z",
    origin: "editorial",
    createdBy: "operator",
    submittedBy: null,
    authorLabel: "VibeHub Curation",
    sourceDiscoverItemId: "discover-stitch-sdk",
    featuredHome: true,
    featuredRadar: true,
    displayOrder: 1
  },
  {
    id: "showcase-radar-booth-pattern",
    slug: "radar-booth-pattern",
    title: "Radar Booth Pattern",
    summary: "외부 링크 큐레이션을 부스처럼 배치해 바이브코딩 작품을 자연스럽게 둘러보게 만드는 카드 패턴입니다.",
    body: [
      "카드는 대표 비주얼, 짧은 설명, 빠른 CTA만 남기고, 커뮤니티 기능은 과감히 제거했습니다.",
      "이 패턴은 나중에 로그인 기반 사용자 제출이 들어와도 같은 레이아웃 위에서 author 메타데이터만 optional하게 추가할 수 있습니다."
    ],
    coverAsset: "/sprites/orbit-grid.svg",
    tags: ["showcase", "radar", "ui"],
    primaryLink: {
      kind: "demo",
      label: "Open radar picks",
      href: "/radar#showcase-picks"
    },
    links: [
      {
        kind: "docs",
        label: "Design notes",
        href: "https://github.com/google-labs-code/stitch-sdk"
      }
    ],
    reviewStatus: "approved",
    scheduledAt: null,
    publishedAt: "2026-03-22T09:30:00.000Z",
    origin: "editorial",
    createdBy: "operator",
    submittedBy: null,
    authorLabel: "VibeHub Lab",
    sourceDiscoverItemId: "discover-openai-api",
    featuredHome: true,
    featuredRadar: true,
    displayOrder: 2
  }
];

export const assetEntries: AssetSlot[] = assetSlots;
