/**
 * Podcast RSS Publisher — TTS 음성(ES)을 팟캐스트 에피소드로 자동 생성.
 *
 * 흐름:
 *   1. longform-voice.wav → ffmpeg MP3 변환 (192kbps)
 *   2. MP3를 공개 URL로 호스팅 (Supabase Storage public bucket)
 *   3. RSS XML feed.xml 자동 생성/갱신
 *   4. Spotify for Creators에 RSS URL 1회 등록 → 이후 자동 배포
 *
 * 수익화 조건: 3 에피소드 + 2,000시간 + 1,000 listeners
 * 비용: $0 (Supabase Storage 무료 1GB)
 */

import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { BRAND_NAME, PODCAST_URL, SITE_URL, THREADS_HANDLE, YOUTUBE_CHANNEL } from "../brand";
import type { PublishPayload } from "../types";
import type {
  ChannelPublisher,
  ChannelPublishResult,
} from "./channel-types";

// ---------------------------------------------------------------------------
// RSS XML 생성
// ---------------------------------------------------------------------------

interface PodcastEpisode {
  title: string;
  description: string;
  audioUrl: string;
  /** 에피소드 길이 (HH:MM:SS) */
  duration: string;
  /** 발행일 (RFC 2822) */
  pubDate: string;
  /** 에피소드 GUID (unique) */
  guid: string;
  /** 파일 크기 (bytes) */
  audioLength: number;
}

interface PodcastFeedConfig {
  title: string;
  description: string;
  language: string;
  author: string;
  siteUrl: string;
  feedUrl: string;
  imageUrl: string;
  categories: string[];
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toRfc2822(date: Date): string {
  return date.toUTCString();
}

function buildEpisodeXml(ep: PodcastEpisode): string {
  return `    <item>
      <title>${escapeXml(ep.title)}</title>
      <description><![CDATA[${ep.description}]]></description>
      <enclosure url="${escapeXml(ep.audioUrl)}" length="${ep.audioLength}" type="audio/mpeg"/>
      <guid isPermaLink="false">${escapeXml(ep.guid)}</guid>
      <pubDate>${ep.pubDate}</pubDate>
      <itunes:duration>${ep.duration}</itunes:duration>
      <itunes:explicit>false</itunes:explicit>
    </item>`;
}

function buildFeedXml(config: PodcastFeedConfig, episodes: PodcastEpisode[]): string {
  const categoryXml = config.categories
    .map((c) => `      <itunes:category text="${escapeXml(c)}"/>`)
    .join("\n");

  const episodesXml = episodes.map(buildEpisodeXml).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(config.title)}</title>
    <description>${escapeXml(config.description)}</description>
    <language>${config.language}</language>
    <link>${escapeXml(config.siteUrl)}</link>
    <atom:link href="${escapeXml(config.feedUrl)}" rel="self" type="application/rss+xml"/>
    <atom:link rel="hub" href="https://pubsubhubbub.appspot.com/"/>
    <itunes:author>${escapeXml(config.author)}</itunes:author>
    <itunes:image href="${escapeXml(config.imageUrl)}"/>
    <itunes:explicit>false</itunes:explicit>
${categoryXml}
    <lastBuildDate>${toRfc2822(new Date())}</lastBuildDate>
${episodesXml}
  </channel>
</rss>`;
}

// ---------------------------------------------------------------------------
// 에피소드 파싱 (기존 feed.xml에서 에피소드 추출)
// ---------------------------------------------------------------------------

function parseExistingEpisodes(feedXml: string): PodcastEpisode[] {
  const episodes: PodcastEpisode[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(feedXml)) !== null) {
    const itemXml = match[1]!;
    const title = itemXml.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
    const description = itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1] ?? "";
    const audioUrl = itemXml.match(/enclosure url="([^"]*?)"/)?.[1] ?? "";
    const audioLength = Number(itemXml.match(/length="(\d+)"/)?.[1] ?? "0");
    const guid = itemXml.match(/<guid[^>]*>(.*?)<\/guid>/)?.[1] ?? "";
    const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? "";
    const duration = itemXml.match(/<itunes:duration>(.*?)<\/itunes:duration>/)?.[1] ?? "00:00:00";

    episodes.push({ title, description, audioUrl, audioLength, guid, pubDate, duration });
  }

  return episodes;
}

// ---------------------------------------------------------------------------
// Publisher 팩토리
// ---------------------------------------------------------------------------

export interface PodcastRssContext {
  /** MP3 공개 URL (Supabase Storage 등) */
  audioPublicUrl: string;
  /** MP3 파일 크기 (bytes) */
  audioFileSize: number;
  /** 에피소드 길이 (HH:MM:SS) */
  duration: string;
  /** feed.xml 출력 디렉토리 */
  feedDir: string;
  /** feed 공개 URL */
  feedUrl: string;
  /** 언어 코드 */
  language?: string;
}

export function createPodcastRssPublisher(
  context: PodcastRssContext,
): ChannelPublisher {
  async function publish(
    payload: PublishPayload,
    opts?: { dryRun?: boolean },
  ): Promise<ChannelPublishResult> {
    if (opts?.dryRun) {
      return {
        channel: "podcast-rss",
        success: true,
        publishedUrl: PODCAST_URL,
        publishedAt: new Date().toISOString(),
        error: "[DRY RUN] Would update podcast feed.xml",
      };
    }

    try {
      const feedPath = path.join(context.feedDir, "feed.xml");
      const lang = context.language ?? "es";

      // 기존 에피소드 로드: 로컬 우선, 없으면 리모트 fetch
      let existingEpisodes: PodcastEpisode[] = [];
      try {
        const existingFeed = await fs.readFile(feedPath, "utf-8");
        existingEpisodes = parseExistingEpisodes(existingFeed);
      } catch {
        // 로컬 feed.xml 없음 → Supabase 리모트에서 fetch
        try {
          const remoteRes = await fetch(context.feedUrl);
          if (remoteRes.ok) {
            const remoteFeed = await remoteRes.text();
            existingEpisodes = parseExistingEpisodes(remoteFeed);
            console.log(`  Podcast RSS: fetched ${existingEpisodes.length} existing episodes from remote`);
          }
        } catch {
          // 리모트도 없으면 새로 시작
        }
      }

      // 에피소드 설명에 크로스프로모 링크 추가
      const bodyText = payload.markdownBody ?? payload.htmlBody ?? "";
      const isEs = lang === "es";
      const briefSlug = payload.slug ?? "";
      const promoLinks = [
        briefSlug ? `📄 ${isEs ? "Brief completo" : "Full Brief"}: ${SITE_URL}/${lang}/brief/${briefSlug}` : "",
        `🧵 Threads: https://threads.net/@${THREADS_HANDLE}`,
        `▶️ YouTube: https://youtube.com/@${YOUTUBE_CHANNEL}`,
        `🌐 ${isEs ? "Sitio web" : "Website"}: ${SITE_URL}`,
      ].filter(Boolean).join("\n");
      const episodeDescription = promoLinks
        ? `${bodyText}\n\n---\n${promoLinks}`
        : bodyText;

      // 새 에피소드 추가
      const newEpisode: PodcastEpisode = {
        title: payload.title,
        description: episodeDescription,
        audioUrl: context.audioPublicUrl,
        audioLength: context.audioFileSize,
        duration: context.duration,
        pubDate: toRfc2822(new Date()),
        guid: `vibehub-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      };

      const allEpisodes = [newEpisode, ...existingEpisodes];

      // Feed config
      const feedConfig: PodcastFeedConfig = {
        title: lang === "es"
          ? `${BRAND_NAME} — Resumen Diario de IA`
          : `${BRAND_NAME} — AI Daily Brief`,
        description: lang === "es"
          ? "Resúmenes diarios de inteligencia artificial y tecnología, generados por IA."
          : "Daily AI and tech briefings, AI-generated.",
        language: lang,
        author: BRAND_NAME,
        siteUrl: SITE_URL,
        feedUrl: context.feedUrl,
        imageUrl: `${SITE_URL}/podcast-cover.jpg`,
        categories: ["Technology", "Artificial Intelligence"],
      };

      // XML 생성 + 저장
      const feedXml = buildFeedXml(feedConfig, allEpisodes);
      await fs.mkdir(context.feedDir, { recursive: true });
      await fs.writeFile(feedPath, feedXml, "utf-8");

      console.log(`  Podcast RSS: feed updated with "${payload.title}" (${allEpisodes.length} episodes total)`);

      // Supabase Storage에 feed.xml 업로드 (podcast-upload.ts보다 늦게 실행되므로 여기서 처리)
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceKey) {
        const feedObjPath = `feed-${lang}.xml`;
        const supabaseUploadUrl = `https://hzxsropbcjfywmospobb.supabase.co/storage/v1/object/podcast/${feedObjPath}`;
        const feedBuffer = await fs.readFile(feedPath);
        const uploadRes = await fetch(supabaseUploadUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/rss+xml",
            "x-upsert": "true",
          },
          body: new Uint8Array(feedBuffer),
        });
        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          console.warn(`  Podcast RSS: Supabase upload failed (${uploadRes.status}): ${errText}`);
        } else {
          console.log(`  Podcast RSS: uploaded feed → ${context.feedUrl}`);

          // WebSub ping — Spotify가 즉시 RSS 폴링하도록 알림
          // (수동 새로고침 없이 에피소드 자동 반영)
          try {
            const pingBody = new URLSearchParams({
              "hub.mode": "publish",
              "hub.url": context.feedUrl,
            });
            const pingRes = await fetch("https://pubsubhubbub.appspot.com/", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: pingBody.toString(),
            });
            if (pingRes.status === 204) {
              console.log(`  Podcast RSS: WebSub ping sent → Spotify will refresh shortly`);
            } else {
              console.warn(`  Podcast RSS: WebSub ping returned ${pingRes.status}`);
            }
          } catch (pingErr) {
            console.warn(`  Podcast RSS: WebSub ping failed (non-critical): ${pingErr}`);
          }
        }
      }

      return {
        channel: "podcast-rss",
        success: true,
        // 크로스프로모엔 Spotify 쇼 URL 노출 (raw RSS feed URL 대신)
        publishedUrl: PODCAST_URL,
        publishedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        channel: "podcast-rss",
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return {
    name: "podcast-rss",
    channel: "podcast-rss",
    publish,
  };
}
