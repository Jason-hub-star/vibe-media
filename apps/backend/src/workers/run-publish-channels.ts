/**
 * CLI: npm run publish:channels <brief-id> [--dry-run]
 * 채널 발행 디스패처 실행.
 *
 * brief-id는 slug 기준으로 Supabase에서 조회.
 * 환경변수:
 *   PUBLISH_CHANNELS — 활성화할 채널 (쉼표 구분, 기본: "threads,youtube")
 *   THREADS_USER_ID, THREADS_ACCESS_TOKEN — Threads API 인증
 */

import {
  dispatchPublish,
  registerPublisher,
  createThreadsPublisher,
  createGhostPublisher,
  createTistoryPublisher,
  createYouTubeLocalPublisher,
} from "@vibehub/media-engine";
import type { BriefChannelMeta, ChannelConfig, ChannelName } from "@vibehub/media-engine";
import { getSupabaseBriefDetail } from "../shared/supabase-editorial-read";
import { reportChannelPublish } from "../shared/channel-publish-report";

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const briefSlug = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");

if (!briefSlug) {
  console.error("usage: tsx src/workers/run-publish-channels.ts <brief-slug> [--dry-run]");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Brief 조회 (Supabase)
// ---------------------------------------------------------------------------

const brief = await getSupabaseBriefDetail(briefSlug);
if (!brief) {
  console.error(`Brief not found: ${briefSlug}`);
  process.exit(1);
}

const briefMeta: BriefChannelMeta = {
  briefId: brief.slug,
  slug: brief.slug,
  title: brief.title,
  markdownBody: Array.isArray(brief.body) ? brief.body.join("\n\n") : "",
  htmlBody: undefined,
  tags: brief.sourceLinks?.map((s: { label: string }) => s.label).slice(0, 5) ?? [],
  coverImageUrl: brief.coverImage,
  languages: ["en"],
};

// ---------------------------------------------------------------------------
// Publisher 등록
// ---------------------------------------------------------------------------

const outputDir = `output/${brief.slug}`;

registerPublisher("threads", () => createThreadsPublisher());
registerPublisher("ghost", () => createGhostPublisher());
registerPublisher("tistory", () => createTistoryPublisher());
registerPublisher("youtube", () => createYouTubeLocalPublisher(outputDir));

// ---------------------------------------------------------------------------
// 채널 설정 (환경변수 기반)
// ---------------------------------------------------------------------------

const VALID_CHANNELS: ChannelName[] = ["threads", "ghost", "tistory", "youtube", "spotify", "podcast-rss"];

const enabledChannels = (process.env.PUBLISH_CHANNELS ?? "threads,youtube")
  .split(",")
  .map((s) => s.trim())
  .filter((s): s is ChannelName => VALID_CHANNELS.includes(s as ChannelName));

const channels: ChannelConfig[] = VALID_CHANNELS.map((name) => ({
  name,
  enabled: enabledChannels.includes(name),
  dryRun,
}));

// ---------------------------------------------------------------------------
// 실행
// ---------------------------------------------------------------------------

console.log(`Publishing brief "${brief.title}" (${brief.slug}) to [${enabledChannels.join(", ")}]${dryRun ? " [DRY RUN]" : ""}`);

const result = await dispatchPublish({
  briefMeta,
  channels,
  dryRun,
  skipCrossPromo: true, // Threads 전파 지연 — 크로스프로모는 별도 실행
});

console.log(JSON.stringify(result, null, 2));

// DB 저장 + Telegram 보고
await reportChannelPublish({
  briefSlug: brief.slug,
  results: result.results,
  crossPromoResults: result.crossPromoResults,
  allSuccess: result.allSuccess,
  durationMs: result.durationMs,
  dryRun,
});

process.exit(result.allSuccess ? 0 : 1);
