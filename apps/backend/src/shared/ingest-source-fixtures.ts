import type { InboxItemContentType } from "@vibehub/content-contracts";

export interface IngestSourceFixture {
  id: string;
  sourceName: string;
  sourceTier: "auto-safe" | "render-required" | "manual-review-required" | "blocked";
  title: string;
  contentType: InboxItemContentType;
  parsedSummary: string;
  tags: string[];
  archiveOnly?: boolean;
  duplicateOf?: string;
  /** content parsing 결과 — content-failed이면 본문 추출 실패 */
  parseStatus?: "summary-only" | "content-enriched" | "content-failed";
}

export const ingestSourceFixtures: IngestSourceFixture[] = [
  {
    id: "fixture-openai-agents-sdk",
    sourceName: "OpenAI News",
    sourceTier: "auto-safe",
    title: "OpenAI Agents SDK update",
    contentType: "article",
    parsedSummary: "새 SDK 구조가 brief 해설과 discover 링크 배치 둘 다 필요한 후보입니다.",
    tags: ["sdk", "launch", "release", "ecosystem"]
  },
  {
    id: "fixture-anthropic-research-note",
    sourceName: "Anthropic Research",
    sourceTier: "auto-safe",
    title: "Anthropic research note on evaluation practice",
    contentType: "doc",
    parsedSummary: "한국어 해설 가치가 높은 연구/운영 메모 후보입니다.",
    tags: ["research", "analysis"]
  },
  {
    id: "fixture-github-trending-crawl4ai",
    sourceName: "GitHub Trending",
    sourceTier: "render-required",
    title: "Crawl4AI trends in developer workflows",
    contentType: "repo",
    parsedSummary: "바로 방문하고 저장할 가치가 높은 오픈소스 레이더 항목입니다.",
    tags: ["open-source", "tool", "repo"]
  },
  {
    id: "fixture-product-hunt-tool",
    sourceName: "Product Hunt AI",
    sourceTier: "render-required",
    title: "New AI workflow website launch",
    contentType: "repo",
    parsedSummary: "빠른 이동과 CTA 정리가 중요한 discover 후보입니다.",
    tags: ["website", "launch", "tool"]
  },
  {
    id: "fixture-karpathy-transcript",
    sourceName: "Transcript Mirror",
    sourceTier: "manual-review-required",
    title: "Andrej Karpathy on code agents and AutoResearch",
    contentType: "doc",
    parsedSummary: "긴 인터뷰를 구조화했지만 직접 인용 경계와 해설 비율을 검수해야 합니다.",
    tags: ["analysis", "transcript"]
  },
  {
    id: "fixture-archive-note",
    sourceName: "Anthropic Research",
    sourceTier: "auto-safe",
    title: "Archived research memo",
    contentType: "doc",
    parsedSummary: "보관 가치만 있고 현재 surface에는 노출하지 않는 메모입니다.",
    tags: ["research", "reference"],
    archiveOnly: true
  },
  {
    id: "fixture-duplicate-release",
    sourceName: "GitHub Release Mirror",
    sourceTier: "auto-safe",
    title: "Duplicate release mirror",
    contentType: "repo",
    parsedSummary: "이미 수집된 release의 중복 미러입니다.",
    tags: ["repo", "release"],
    duplicateOf: "fixture-github-trending-crawl4ai"
  }
];
