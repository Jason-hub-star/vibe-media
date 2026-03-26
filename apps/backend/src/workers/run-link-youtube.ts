/**
 * CLI: npm run publish:link-youtube <brief-slug> <video-id>
 * YouTube video_id 등록 후 Pass 3 크로스프로모 실행.
 *
 * brief-slug로 Supabase에서 기존 발행 URL을 조회한 뒤,
 * YouTube URL을 추가하여 기존 채널에 크로스프로모 주입.
 */

import {
  linkYouTubeToChannels,
  createThreadsPublisher,
} from "@vibehub/media-engine";
import type { ChannelName, ChannelPublisher } from "@vibehub/media-engine";
import { getSupabaseBriefDetail } from "../shared/supabase-editorial-read";

const [briefSlug, videoId] = process.argv.slice(2);

if (!briefSlug || !videoId) {
  console.error("usage: tsx src/workers/run-link-youtube.ts <brief-slug> <video-id>");
  process.exit(1);
}

// Brief 조회
const brief = await getSupabaseBriefDetail(briefSlug);
if (!brief) {
  console.error(`Brief not found: ${briefSlug}`);
  process.exit(1);
}

// Publisher 등록
const publishers = new Map<ChannelName, ChannelPublisher>();
publishers.set("threads", createThreadsPublisher());

// TODO: brief_channel_meta 테이블에서 기존 발행 URL 조회
// 현재는 Supabase에 channel_results 스키마가 없으므로 빈 맵
const existingUrls: Partial<Record<ChannelName, string>> = {};

const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

console.log(`Linking YouTube ${videoId} to brief "${brief.title}" (${briefSlug})`);

const results = await linkYouTubeToChannels({
  youtubeUrl,
  existingUrls,
  publishers,
  title: brief.title,
  slug: brief.slug,
});

console.log(JSON.stringify(results, null, 2));
