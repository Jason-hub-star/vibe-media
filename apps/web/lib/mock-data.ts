import type {
  AssetSlot,
  BriefDetail,
  DiscoverItem,
  ExceptionQueueItem,
  InboxItem,
  IngestRun,
  PublishQueueItem,
  SourceEntry
} from "@vibehub/content-contracts";
import { assetSlots } from "@vibehub/design-tokens";
import { deriveExceptionQueueItems, derivePublishQueueItemsFromInbox, deriveReviewItemsFromInbox } from "./pipeline-routing";
import { reviewItems as reviewTemplates } from "./review-queue-mock";
import {
  deriveVideoExceptionQueueItems,
  deriveVideoPublishQueueItems,
  videoJobs
} from "./video-pipeline-mock";

export { videoJobs } from "./video-pipeline-mock";

export const briefDetails: BriefDetail[] = [
  {
    slug: "openai-agents-sdk-update",
    title: "OpenAI Agents SDK update",
    summary: "최신 SDK 변화가 자동화 파이프라인에 주는 실제 의미를 한국어로 정리합니다.",
    status: "review",
    publishedAt: null,
    sourceCount: 3,
    body: [
      "에이전트 개발의 핵심은 모델보다 운영 경계와 도구 호출 설계입니다.",
      "이번 업데이트는 여러 런타임을 하나의 추적 가능 흐름으로 연결하는 데 초점이 있습니다."
    ],
    sourceLinks: [
      { label: "OpenAI News", href: "https://openai.com/news/" },
      { label: "Platform Docs", href: "https://platform.openai.com/docs/" },
      { label: "Changelog", href: "https://platform.openai.com/docs/changelog" }
    ]
  },
  {
    slug: "stitch-driven-design-ops",
    title: "Stitch-driven design ops",
    summary: "시안 탐색과 실제 컴포넌트 구현을 분리하는 운영 규칙을 정리합니다.",
    status: "published",
    publishedAt: "2026-03-21T08:30:00.000Z",
    sourceCount: 2,
    body: [
      "Stitch는 방향을 넓히는 도구이고, 최종 구현은 토큰과 수작업 컴포넌트가 책임집니다.",
      "이 방식은 일관성과 테스트 가능성, 그리고 팀 분업을 동시에 잡습니다."
    ],
    sourceLinks: [
      { label: "Stitch SDK", href: "https://github.com/google-labs-code/stitch-sdk" },
      { label: "Impeccable", href: "https://github.com/pbakaus/impeccable" }
    ]
  }
];

export const sourceEntries: SourceEntry[] = [
  {
    id: "source-openai",
    label: "OpenAI News",
    category: "company",
    href: "https://openai.com/news/",
    freshness: "daily"
  },
  {
    id: "source-google",
    label: "Google Developers Blog",
    category: "release",
    href: "https://developers.googleblog.com/",
    freshness: "daily"
  },
  {
    id: "source-anthropic",
    label: "Anthropic Research",
    category: "research",
    href: "https://www.anthropic.com/research",
    freshness: "weekly"
  }
];

export const inboxItems: InboxItem[] = [
  {
    id: "inbox-openai-agents-sdk",
    sourceName: "OpenAI News",
    sourceTier: "auto-safe",
    title: "OpenAI Agents SDK update",
    contentType: "article",
    stage: "classified",
    targetSurface: "both",
    confidence: 0.94,
    parsedSummary: "에이전트 SDK 변경점이 brief와 radar 둘 다에 걸리는 high-signal 항목으로 들어왔습니다."
  },
  {
    id: "inbox-karpathy-interview",
    sourceName: "YouTube Transcript Mirror",
    sourceTier: "manual-review-required",
    title: "Andrej Karpathy on code agents and AutoResearch",
    contentType: "doc",
    stage: "parsed",
    targetSurface: "brief",
    confidence: 0.81,
    parsedSummary: "긴 인터뷰라 원문 파싱은 완료됐고, 핵심 주장과 직접 인용 구간 분리가 필요한 상태입니다."
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
    parsedSummary: "행사 페이지에서 일정과 링크를 뽑아냈고, discover용 액션 링크 후보까지 생성된 상태입니다."
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

export const ingestRuns: IngestRun[] = [
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

export const reviewItems = deriveReviewItemsFromInbox(inboxItems, reviewTemplates);

const basePublishQueueItems = derivePublishQueueItemsFromInbox(inboxItems);

export const publishQueueItems: PublishQueueItem[] = [
  ...basePublishQueueItems,
  ...deriveVideoPublishQueueItems(videoJobs)
];

const baseExceptionQueueItems = deriveExceptionQueueItems(
  inboxItems,
  reviewTemplates,
  ingestRuns,
  deriveVideoExceptionQueueItems(videoJobs)
);

export const exceptionQueueItems: ExceptionQueueItem[] = baseExceptionQueueItems;

export const discoverItems: DiscoverItem[] = [
  {
    id: "discover-stitch-sdk",
    slug: "stitch-sdk",
    title: "Stitch SDK",
    category: "plugin",
    summary: "Quickly generate multiple UI variants while keeping tokens and handcrafted components as the source of truth.",
    status: "featured",
    reviewStatus: "approved",
    scheduledAt: null,
    publishedAt: "2026-03-22T09:00:00.000Z",
    tags: ["design", "frontend", "variants"],
    highlighted: true,
    actions: [
      { kind: "github", label: "GitHub", href: "https://github.com/google-labs-code/stitch-sdk" },
      { kind: "docs", label: "Docs", href: "https://github.com/google-labs-code/stitch-sdk" }
    ]
  },
  {
    id: "discover-impeccable",
    slug: "impeccable",
    title: "Impeccable",
    category: "open_source",
    summary: "A frontend quality reference for visual polish and detail inspection.",
    status: "tracked",
    reviewStatus: "approved",
    scheduledAt: null,
    publishedAt: "2026-03-22T09:05:00.000Z",
    tags: ["quality", "design", "reference"],
    highlighted: false,
    actions: [
      { kind: "github", label: "GitHub", href: "https://github.com/pbakaus/impeccable" }
    ]
  },
  {
    id: "discover-ai-engineer-worlds-fair",
    slug: "ai-engineer-worlds-fair",
    title: "AI Engineer World's Fair",
    category: "event",
    summary: "The flagship event for scanning agents, models, infra, and product case studies in one pass.",
    status: "watching",
    reviewStatus: "approved",
    scheduledAt: null,
    publishedAt: "2026-03-22T09:10:00.000Z",
    tags: ["event", "agents", "community"],
    highlighted: true,
    actions: [
      { kind: "visit", label: "Site", href: "https://www.ai.engineer/" }
    ]
  },
  {
    id: "discover-openai-api",
    slug: "openai-api-platform",
    title: "OpenAI API Platform",
    category: "api",
    summary: "The primary API entry point covering model calls, agents, and tool integrations.",
    status: "featured",
    reviewStatus: "approved",
    scheduledAt: null,
    publishedAt: "2026-03-22T09:15:00.000Z",
    tags: ["api", "models", "agents"],
    highlighted: true,
    actions: [
      { kind: "visit", label: "Platform", href: "https://platform.openai.com/" },
      { kind: "docs", label: "Docs", href: "https://platform.openai.com/docs/" }
    ]
  },
  {
    id: "discover-agents-sdk",
    slug: "openai-agents-sdk",
    title: "OpenAI Agents SDK",
    category: "agent",
    summary: "An SDK for rapid experimentation with agent workflows and tool-call boundaries.",
    status: "tracked",
    reviewStatus: "approved",
    scheduledAt: null,
    publishedAt: "2026-03-22T09:20:00.000Z",
    tags: ["agents", "sdk", "automation"],
    highlighted: false,
    actions: [
      { kind: "docs", label: "Docs", href: "https://platform.openai.com/docs/" }
    ]
  },
  {
    id: "discover-mlx",
    slug: "mlx",
    title: "MLX",
    category: "open_source",
    summary: "A framework for quick local model experimentation on Apple Silicon.",
    status: "tracked",
    reviewStatus: "approved",
    scheduledAt: null,
    publishedAt: "2026-03-22T09:25:00.000Z",
    tags: ["apple-silicon", "local-models"],
    highlighted: false,
    actions: [
      { kind: "github", label: "GitHub", href: "https://github.com/ml-explore/mlx" },
      { kind: "download", label: "Install", href: "https://github.com/ml-explore/mlx" }
    ]
  },
  {
    id: "discover-pytorch-tutorials",
    slug: "pytorch-tutorials",
    title: "PyTorch Tutorials",
    category: "tutorial",
    summary: "Learning resources that connect experimentation to deployment, tracked separately.",
    status: "watching",
    reviewStatus: "approved",
    scheduledAt: null,
    publishedAt: "2026-03-22T09:30:00.000Z",
    tags: ["tutorial", "learning", "ml"],
    highlighted: false,
    actions: [
      { kind: "visit", label: "Site", href: "https://pytorch.org/tutorials/" }
    ]
  },
  {
    id: "discover-hugging-face-open-llm-leaderboard",
    slug: "open-llm-leaderboard",
    title: "Open LLM Leaderboard",
    category: "benchmark",
    summary: "A benchmark tracker for model comparison and trend observation.",
    status: "tracked",
    reviewStatus: "approved",
    scheduledAt: null,
    publishedAt: "2026-03-22T09:35:00.000Z",
    tags: ["benchmark", "models", "evaluation"],
    highlighted: false,
    actions: [
      { kind: "visit", label: "Leaderboard", href: "https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard" }
    ]
  },
  {
    id: "discover-openai-fund",
    slug: "openai-fund",
    title: "AI Startup Grants Watch",
    category: "grant",
    summary: "Tracking credits, grants, and incubation programs for AI startups.",
    status: "watching",
    reviewStatus: "approved",
    scheduledAt: null,
    publishedAt: "2026-03-22T09:40:00.000Z",
    tags: ["grant", "credits", "opportunity"],
    highlighted: true,
    actions: [
      { kind: "visit", label: "Track", href: "https://openai.com/" }
    ]
  }
];

export const assets: AssetSlot[] = assetSlots;
