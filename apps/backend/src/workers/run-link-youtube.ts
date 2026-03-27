/**
 * CLI:
 *   npm run publish:link-youtube -- <brief-slug> <video-id-or-url>
 *   npm run publish:link-youtube -- <video-id-or-url>
 * YouTube public link 등록 후 Pass 3 크로스프로모 실행.
 *
 * brief-slug가 없으면 업로드 대기 중인 YouTube metadata title과
 * 실제 YouTube 제목(oEmbed)을 대조해 brief를 자동 매칭한다.
 */

import {
  buildCrossPromoBlocks,
  createThreadsPublisher,
} from "@vibehub/media-engine";
import type { ChannelName, ChannelPublisher, CrossPromoResult } from "@vibehub/media-engine";
import { getSupabaseBriefDetail } from "../shared/supabase-editorial-read";
import {
  fetchYouTubeOEmbedTitle,
  listLatestSuccessfulChannelUrlsByLocale,
  listLatestSuccessfulChannelUrls,
  parseYouTubeInput,
  recordPublicYouTubePublishResult,
  resolveBriefSlugForYouTubeInput,
  updateBriefYouTubeLink,
} from "../shared/youtube-linking";

const args = process.argv.slice(2);
const rawBriefSlug = args.length >= 2 ? args[0] : null;
const rawYouTubeInput = args.length >= 2 ? args[1] : args[0];

if (!rawYouTubeInput) {
  console.error("usage: tsx src/workers/run-link-youtube.ts [brief-slug] <video-id-or-url>");
  process.exit(1);
}

let youtubeVideoId = "";
let youtubeUrl = "";

try {
  ({ youtubeVideoId, youtubeUrl } = parseYouTubeInput(rawYouTubeInput));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const resolvedLink = rawBriefSlug
  ? {
      briefSlug: rawBriefSlug,
      resolvedBy: "explicit" as const,
      matchedTitle: undefined,
    }
  : await resolveBriefSlugForYouTubeInput({
      youtubeVideoId,
      youtubeUrl,
    });

const briefSlug = resolvedLink.briefSlug;

// Brief 조회
const brief = await getSupabaseBriefDetail(briefSlug);
if (!brief) {
  console.error(`Brief not found: ${briefSlug}`);
  process.exit(1);
}

// Publisher 등록
const publishers = new Map<ChannelName, ChannelPublisher>();
publishers.set("threads", createThreadsPublisher());

await updateBriefYouTubeLink({
  briefSlug,
  youtubeVideoId,
  youtubeUrl,
});
await recordPublicYouTubePublishResult({
  briefSlug,
  youtubeUrl,
  locale: brief.canonicalLocale ?? brief.locale ?? "en",
});

const existingUrls = await listLatestSuccessfulChannelUrls(briefSlug);
const threadsUrls = await listLatestSuccessfulChannelUrlsByLocale(briefSlug, "threads");
const promoBlocks = buildCrossPromoBlocks({
  ...existingUrls,
  youtube: youtubeUrl,
});
const youtubeTitle =
  resolvedLink.resolvedBy === "pending-title-match"
    ? resolvedLink.matchedTitle
    : await fetchYouTubeOEmbedTitle(youtubeUrl).catch(() => null);

console.log(`Linking YouTube ${youtubeVideoId} to brief "${brief.title}" (${briefSlug})`);

const threadsPublisher = publishers.get("threads");
const results: CrossPromoResult[] = [];

if (threadsPublisher?.injectCrossPromo) {
  for (const threadsUrl of threadsUrls) {
    results.push(await threadsPublisher.injectCrossPromo(threadsUrl, promoBlocks));
  }
}

console.log(
  JSON.stringify(
    {
      briefSlug,
      resolvedBy: resolvedLink.resolvedBy,
      youtubeVideoId,
      youtubeUrl,
      youtubeTitle,
      existingUrls,
      threadsUrls,
      crossPromoResults: results,
    },
    null,
    2,
  ),
);
