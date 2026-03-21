import type {
  AssetSlot,
  BriefDetail,
  DiscoverItem,
  InboxItem,
  IngestRun,
  ReviewItem,
  SourceEntry,
  VideoJob
} from "@vibehub/content-contracts";
import { assetSlots } from "@vibehub/design-tokens";

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

export const reviewItems: ReviewItem[] = [
  {
    id: "review-openai-agents-sdk",
    sourceLabel: "OpenAI News",
    sourceHref: "https://openai.com/news/",
    sourceExcerpt: "SDK 업데이트 원문과 changelog를 묶어 읽고, 한국어 브리프로 내릴 가치가 높은 항목입니다.",
    parsedSummary: "도구 호출 경계와 운영 추적성이 바뀐 점을 brief와 discover 둘 다에 반영할 수 있게 정리된 상태입니다.",
    keyPoints: [
      "source count 3 확보",
      "target surface both 후보",
      "critic pass 전 마지막 human check 필요"
    ],
    targetSurface: "both",
    confidence: 0.92,
    previewTitle: "OpenAI Agents SDK update",
    previewSummary: "자동화 파이프라인 관점에서 SDK 변화가 왜 중요한지 한국어로 빠르게 읽히는 preview 초안입니다."
  },
  {
    id: "review-karpathy-interview",
    sourceLabel: "Transcript Mirror",
    sourceHref: "https://youtu.be/kwSVtQ7dziU",
    sourceExcerpt: "긴 인터뷰 원문을 브리프로 내리기 전에 직접 인용과 요약, 주장 강도를 다시 정리해야 하는 예외 케이스입니다.",
    parsedSummary: "에이전트 운영, human-on-exception, 장기 실행 메모리라는 세 축은 정리됐지만 인용 범위와 톤 보정이 남아 있습니다.",
    keyPoints: [
      "long-form source review needed",
      "brief surface candidate",
      "quote boundary needs human check"
    ],
    targetSurface: "brief",
    confidence: 0.78,
    previewTitle: "Karpathy on the loopy era of AI",
    previewSummary: "에이전트 운영 능력이 개발자의 핵심 숙련으로 이동하고 있다는 관점을 VibeHub 문맥으로 재구성한 preview 초안입니다."
  }
];

export const videoJobs: VideoJob[] = [
  {
    id: "job-minecraft-1",
    title: "Minecraft survival session",
    kind: "gameplay",
    status: "drafted",
    assetLinkState: "partial",
    sourceSession: "minecraft-0319"
  },
  {
    id: "job-roblox-2",
    title: "Roblox recap",
    kind: "recap",
    status: "review",
    assetLinkState: "complete",
    sourceSession: "roblox-0320"
  }
];

export const discoverItems: DiscoverItem[] = [
  {
    id: "discover-stitch-sdk",
    slug: "stitch-sdk",
    title: "Stitch SDK",
    category: "plugin",
    summary: "빠르게 여러 UI 시안을 뽑고, 실제 구현은 토큰과 수작업 컴포넌트로 이어가는 디자인 탐색 도구입니다.",
    status: "featured",
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
    summary: "시각 품질과 디테일 점검에 쓰는 프론트엔드 품질 레퍼런스입니다.",
    status: "tracked",
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
    summary: "에이전트, 모델, 인프라, 제품 사례를 한 번에 훑기 좋은 대표 행사 트래커입니다.",
    status: "watching",
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
    summary: "모델 호출, 에이전트, 툴 연동까지 포함한 대표 서비스형 API 진입점입니다.",
    status: "featured",
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
    summary: "에이전트 워크플로와 도구 호출 경계를 빠르게 실험할 수 있는 SDK 축입니다.",
    status: "tracked",
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
    summary: "Apple Silicon 환경에서 로컬 모델 실험을 빠르게 시작할 수 있는 프레임워크입니다.",
    status: "tracked",
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
    summary: "실험부터 배포까지 연결되는 학습 자료 축을 따로 추적하기 위한 예시 항목입니다.",
    status: "watching",
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
    summary: "모델 비교와 추세 관찰을 위한 벤치마크 축 예시입니다.",
    status: "tracked",
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
    summary: "크레딧, 지원금, 인큐베이션 프로그램을 추적하기 위한 grant 축 예시 항목입니다.",
    status: "watching",
    tags: ["grant", "credits", "opportunity"],
    highlighted: true,
    actions: [
      { kind: "visit", label: "Track", href: "https://openai.com/" }
    ]
  }
];

export const assets: AssetSlot[] = assetSlots;
