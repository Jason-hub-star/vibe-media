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

export const reviewEntries: ReviewItem[] = [
  {
    id: "review-openai-agents-sdk",
    sourceLabel: "OpenAI News",
    sourceHref: "https://openai.com/news/",
    sourceExcerpt: "SDK 업데이트 원문과 changelog를 함께 읽고, 한국어 에디토리얼로 가공할 가치가 높은 항목입니다.",
    parsedSummary: "source, parsed, preview 세 면을 동시에 보고 최종 surface와 톤을 잠그기 위한 review 후보입니다.",
    keyPoints: [
      "direct source links 확보",
      "both surface candidate",
      "human-on-exception review queue"
    ],
    targetSurface: "both",
    confidence: 0.92,
    previewTitle: "OpenAI Agents SDK update",
    previewSummary: "VibeHub Brief와 Radar에 동시에 올라갈 수 있는 preview 초안입니다."
  }
];

export const videoJobs: VideoJob[] = [
  {
    id: "video-job-1",
    title: "Minecraft survival session",
    kind: "gameplay",
    status: "drafted",
    assetLinkState: "partial",
    sourceSession: "minecraft-session-0319"
  },
  {
    id: "video-job-2",
    title: "Roblox obstacle run recap",
    kind: "recap",
    status: "review",
    assetLinkState: "complete",
    sourceSession: "roblox-session-0320"
  }
];

export const discoverEntries: DiscoverItem[] = [
  {
    id: "discover-stitch-sdk",
    slug: "stitch-sdk",
    title: "Stitch SDK",
    category: "plugin",
    summary: "시안 생성과 패턴 추출 워크플로를 빠르게 여는 디자인 탐색 도구입니다.",
    status: "featured",
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
    summary: "서브에이전트 기반 개발 워크플로 참고 자료를 한곳에서 훑는 큐레이션 링크입니다.",
    status: "tracked",
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
    summary: "현업 제작자 관점에서 볼 만한 발표와 부스를 찾기 쉬운 대표 행사입니다.",
    status: "watching",
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
    summary: "서비스형 모델 호출과 에이전트 개발 진입점을 묶는 API 축입니다.",
    status: "featured",
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
    summary: "분업형 에이전트 운영 패턴을 레이더에 올려두기 위한 agent 축 예시입니다.",
    status: "tracked",
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
    summary: "툴 연결과 플러그인 브리지 구축을 위한 integration 축 예시입니다.",
    status: "watching",
    tags: ["mcp", "integration", "plugins"],
    highlighted: false,
    actions: [
      { kind: "visit", label: "Guides", href: "https://modelcontextprotocol.io/" }
    ]
  }
];

export const assetEntries: AssetSlot[] = assetSlots;
