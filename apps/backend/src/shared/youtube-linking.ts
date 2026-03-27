import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { DEFAULT_CANONICAL_LOCALE } from "@vibehub/content-contracts";
import type { ChannelName } from "@vibehub/media-engine";

import { ensureBriefYouTubeLinkSchema } from "./brief-youtube-schema";
import { resetEditorialCache } from "./supabase-editorial-read";
import { createSupabaseSql } from "./supabase-postgres";

const CHANNEL_NAMES: ChannelName[] = [
  "threads",
  "ghost",
  "tistory",
  "spotify",
  "youtube",
  "podcast-rss",
];
const CHANNEL_NAME_SET = new Set<ChannelName>(CHANNEL_NAMES);
const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export interface ParsedYouTubeInput {
  youtubeVideoId: string;
  youtubeUrl: string;
  youtubeEmbedUrl: string;
}

interface PendingYouTubeUploadRow {
  brief_slug: string;
  locale: string;
  published_url: string;
  created_at: string;
}

export interface ResolvedYouTubeBriefLink {
  briefSlug: string;
  resolvedBy: "existing-link" | "pending-title-match";
  matchedTitle?: string;
}

export function parseYouTubeInput(input: string): ParsedYouTubeInput {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("YouTube URL 또는 11자리 video id가 필요합니다.");
  }

  if (YOUTUBE_ID_PATTERN.test(trimmed)) {
    return buildParsedYouTubeInput(trimmed);
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("YouTube URL 또는 11자리 video id가 필요합니다.");
  }

  const hostname = url.hostname.replace(/^www\./, "").toLowerCase();
  let videoId: string | null = null;

  if (hostname === "youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0] ?? null;
  } else if (
    hostname === "youtube.com" ||
    hostname === "m.youtube.com" ||
    hostname === "music.youtube.com"
  ) {
    if (url.pathname === "/watch") {
      videoId = url.searchParams.get("v");
    } else {
      const segments = url.pathname.split("/").filter(Boolean);
      if (["shorts", "embed", "live"].includes(segments[0] ?? "")) {
        videoId = segments[1] ?? null;
      }
    }
  }

  if (!videoId || !YOUTUBE_ID_PATTERN.test(videoId)) {
    throw new Error("유효한 YouTube URL이 아닙니다.");
  }

  return buildParsedYouTubeInput(videoId);
}

function buildParsedYouTubeInput(youtubeVideoId: string): ParsedYouTubeInput {
  return {
    youtubeVideoId,
    youtubeUrl: `https://www.youtube.com/watch?v=${youtubeVideoId}`,
    youtubeEmbedUrl: `https://www.youtube.com/embed/${youtubeVideoId}`,
  };
}

export function normalizeYouTubeTitle(title: string) {
  return title.trim().replace(/\s+/g, " ").toLowerCase();
}

export function isPublicChannelUrl(channel: ChannelName, publishedUrl: string) {
  const trimmed = publishedUrl.trim();
  if (!trimmed) return false;

  if (channel === "youtube") {
    return /^(https?:\/\/)(www\.)?(youtube\.com|youtu\.be)\//i.test(trimmed);
  }

  return /^https?:\/\//i.test(trimmed);
}

export async function updateBriefYouTubeLink(args: {
  briefSlug: string;
  youtubeVideoId: string;
  youtubeUrl: string;
  linkedAt?: string;
}) {
  await ensureBriefYouTubeLinkSchema();
  const sql = createSupabaseSql();
  const linkedAt = args.linkedAt ?? new Date().toISOString();

  try {
    await sql`
      update public.brief_posts
      set
        youtube_video_id = ${args.youtubeVideoId},
        youtube_url = ${args.youtubeUrl},
        youtube_linked_at = ${linkedAt}
      where slug = ${args.briefSlug}
    `;
    resetEditorialCache();
  } finally {
    await sql.end();
  }
}

export async function recordPublicYouTubePublishResult(args: {
  briefSlug: string;
  youtubeUrl: string;
  locale?: string;
}) {
  const sql = createSupabaseSql();

  try {
    await sql`
      insert into public.channel_publish_results
        (brief_slug, channel_name, success, published_url, dry_run, duration_ms, locale)
      values
        (${args.briefSlug}, 'youtube', true, ${args.youtubeUrl}, false, null, ${args.locale ?? "en"})
    `;
  } finally {
    await sql.end();
  }
}

export async function listLatestSuccessfulChannelUrls(
  briefSlug: string,
): Promise<Partial<Record<ChannelName, string>>> {
  const sql = createSupabaseSql();

  try {
    const rows = await sql<Array<{ channel_name: string; published_url: string }>>`
      select distinct on (channel_name)
        channel_name,
        published_url
      from public.channel_publish_results
      where brief_slug = ${briefSlug}
        and success = true
        and dry_run = false
        and published_url is not null
      order by channel_name asc, created_at desc
    `;

    const urls: Partial<Record<ChannelName, string>> = {};

    for (const row of rows) {
      if (!CHANNEL_NAME_SET.has(row.channel_name as ChannelName)) continue;

      const channel = row.channel_name as ChannelName;
      if (!isPublicChannelUrl(channel, row.published_url)) continue;
      urls[channel] = row.published_url;
    }

    return urls;
  } finally {
    await sql.end();
  }
}

export async function listLatestSuccessfulChannelUrlsByLocale(
  briefSlug: string,
  channelName: ChannelName,
): Promise<string[]> {
  const sql = createSupabaseSql();

  try {
    const rows = await sql<Array<{ published_url: string }>>`
      select distinct on (locale)
        published_url
      from public.channel_publish_results
      where brief_slug = ${briefSlug}
        and channel_name = ${channelName}
        and success = true
        and dry_run = false
        and published_url is not null
      order by locale asc, created_at desc
    `;

    return rows
      .map((row) => row.published_url)
      .filter((publishedUrl) => isPublicChannelUrl(channelName, publishedUrl));
  } finally {
    await sql.end();
  }
}

async function readYouTubeMetadataTitle(metadataUrl: string) {
  if (!metadataUrl.startsWith("file://")) return null;

  try {
    const metadataPath = fileURLToPath(metadataUrl);
    const raw = await fs.readFile(metadataPath, "utf8");
    const parsed = JSON.parse(raw) as { title?: unknown };
    return typeof parsed.title === "string" && parsed.title.trim()
      ? parsed.title.trim()
      : null;
  } catch {
    return null;
  }
}

export async function fetchYouTubeOEmbedTitle(youtubeUrl: string) {
  const endpoint = new URL("https://www.youtube.com/oembed");
  endpoint.searchParams.set("url", youtubeUrl);
  endpoint.searchParams.set("format", "json");

  const response = await fetch(endpoint, {
    headers: {
      accept: "application/json",
      "user-agent": "VibeHubMedia/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`YouTube 제목 조회에 실패했습니다 (${response.status}).`);
  }

  const payload = (await response.json()) as { title?: unknown };
  if (typeof payload.title !== "string" || !payload.title.trim()) {
    throw new Error("YouTube 제목을 읽지 못했습니다.");
  }

  return payload.title.trim();
}

async function findBriefSlugByExistingYouTubeLink(args: {
  youtubeVideoId: string;
  youtubeUrl: string;
}) {
  await ensureBriefYouTubeLinkSchema();
  const sql = createSupabaseSql();

  try {
    const rows = await sql<Array<{ slug: string }>>`
      select slug
      from public.brief_posts
      where youtube_video_id = ${args.youtubeVideoId}
         or youtube_url = ${args.youtubeUrl}
      order by youtube_linked_at desc nulls last, slug asc
      limit 1
    `;

    return rows[0]?.slug ?? null;
  } finally {
    await sql.end();
  }
}

async function listPendingYouTubeUploadRows(): Promise<PendingYouTubeUploadRow[]> {
  await ensureBriefYouTubeLinkSchema();
  const sql = createSupabaseSql();

  try {
    return await sql<PendingYouTubeUploadRow[]>`
      select distinct on (c.brief_slug)
        c.brief_slug,
        c.locale,
        c.published_url,
        c.created_at
      from public.channel_publish_results c
      join public.brief_posts bp on bp.slug = c.brief_slug
      where c.channel_name = 'youtube'
        and c.success = true
        and c.dry_run = false
        and c.locale = ${DEFAULT_CANONICAL_LOCALE}
        and c.published_url like 'file://%'
        and bp.youtube_url is null
      order by c.brief_slug asc, c.created_at desc
    `;
  } finally {
    await sql.end();
  }
}

export async function resolveBriefSlugForYouTubeInput(args: {
  youtubeVideoId: string;
  youtubeUrl: string;
}): Promise<ResolvedYouTubeBriefLink> {
  const existingBriefSlug = await findBriefSlugByExistingYouTubeLink(args);
  if (existingBriefSlug) {
    return {
      briefSlug: existingBriefSlug,
      resolvedBy: "existing-link",
    };
  }

  const targetTitle = normalizeYouTubeTitle(
    await fetchYouTubeOEmbedTitle(args.youtubeUrl),
  );
  const rows = await listPendingYouTubeUploadRows();
  const matches = new Map<string, { briefSlug: string; title: string }>();

  for (const row of rows) {
    const metadataTitle = await readYouTubeMetadataTitle(row.published_url);
    if (!metadataTitle) continue;
    if (normalizeYouTubeTitle(metadataTitle) !== targetTitle) continue;

    matches.set(row.brief_slug, {
      briefSlug: row.brief_slug,
      title: metadataTitle,
    });
  }

  if (matches.size === 1) {
    const match = [...matches.values()][0];
    return {
      briefSlug: match.briefSlug,
      resolvedBy: "pending-title-match",
      matchedTitle: match.title,
    };
  }

  if (matches.size === 0) {
    throw new Error(
      "업로드 대기 중인 브리프를 자동 매칭하지 못했습니다. /vh-youtube <brief-slug> <youtube-url> 형식으로 다시 보내주세요.",
    );
  }

  throw new Error(
    "동일한 YouTube 제목과 일치하는 브리프 후보가 여러 개입니다. /vh-youtube <brief-slug> <youtube-url> 형식으로 다시 보내주세요.",
  );
}
