/**
 * 채널별 크로스 프로모션 텍스트 생성.
 * 순수 함수 — 외부 의존성 없음.
 */

import type { ChannelName, CrossPromoBlock } from "./channel-types";

// ---------------------------------------------------------------------------
// 채널별 제한
// ---------------------------------------------------------------------------

const CHANNEL_LIMITS: Record<ChannelName, number> = {
  threads: 500,
  ghost: 10_000,
  tistory: 10_000,
  spotify: 4000,
  youtube: 5000,
  "podcast-rss": 4000,
};

// ---------------------------------------------------------------------------
// 프로모 템플릿
// ---------------------------------------------------------------------------

interface PromoContext {
  title: string;
  slug: string;
  /** 채널별 발행 URL */
  publishedUrls: Partial<Record<ChannelName, string>>;
}

/** Threads용 크로스프로모 텍스트 (500자 제한) */
function threadsPromo(ctx: PromoContext, targets: CrossPromoBlock[]): string {
  const links = targets
    .filter((t) => t.targetChannel !== "threads")
    .map((t) => `${channelEmoji(t.targetChannel)} ${t.text}: ${t.url}`)
    .join("\n");

  const text = `More on "${ctx.title}":\n${links}`;
  return text.length > 500 ? text.slice(0, 497) + "..." : text;
}

/** Ghost/Tistory용 HTML 크로스프로모 블록 */
function htmlPromo(ctx: PromoContext, targets: CrossPromoBlock[]): string {
  const links = targets
    .map(
      (t) =>
        `<li><a href="${t.url}" target="_blank" rel="noopener">${channelEmoji(t.targetChannel)} ${t.text}</a></li>`,
    )
    .join("\n");

  return `<div class="cross-promo">
<h4>Also available on</h4>
<ul>
${links}
</ul>
</div>`;
}

/** YouTube/Spotify/Podcast용 플레인텍스트 프로모 */
function plainPromo(ctx: PromoContext, targets: CrossPromoBlock[]): string {
  const links = targets
    .map((t) => `${t.text}: ${t.url}`)
    .join("\n");
  return `Read more about "${ctx.title}":\n${links}`;
}

// ---------------------------------------------------------------------------
// 채널 이모지
// ---------------------------------------------------------------------------

function channelEmoji(channel: ChannelName): string {
  const map: Record<ChannelName, string> = {
    threads: "🧵",
    ghost: "📝",
    tistory: "📋",
    spotify: "🎧",
    youtube: "🎬",
    "podcast-rss": "🎙️",
  };
  return map[channel] ?? "🔗";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * 특정 채널의 크로스프로모 텍스트 생성.
 * @param forChannel - 프로모 텍스트를 받을 채널
 * @param ctx - 프로모 컨텍스트 (제목, URL 등)
 * @param allBlocks - 모든 채널의 CrossPromoBlock 배열
 */
export function buildPromoText(
  forChannel: ChannelName,
  ctx: PromoContext,
  allBlocks: CrossPromoBlock[],
): string {
  // 자기 자신 채널 제외
  const targets = allBlocks.filter((b) => b.targetChannel !== forChannel);
  if (targets.length === 0) return "";

  switch (forChannel) {
    case "threads":
      return threadsPromo(ctx, targets);
    case "ghost":
    case "tistory":
      return htmlPromo(ctx, targets);
    default:
      return plainPromo(ctx, targets);
  }
}

/**
 * 발행된 URL들로부터 CrossPromoBlock 배열 생성.
 */
export function buildCrossPromoBlocks(
  publishedUrls: Partial<Record<ChannelName, string>>,
): CrossPromoBlock[] {
  const blocks: CrossPromoBlock[] = [];

  for (const [channel, url] of Object.entries(publishedUrls)) {
    if (!url) continue;
    blocks.push({
      targetChannel: channel as ChannelName,
      url,
      text: channelLabel(channel as ChannelName),
    });
  }

  return blocks;
}

function channelLabel(channel: ChannelName, locale?: string): string {
  if (locale === "es") {
    const esMap: Record<ChannelName, string> = {
      threads: "Leer en Threads",
      ghost: "Artículo completo en VibeHub",
      tistory: "Leer en Tistory",
      spotify: "Escuchar en Spotify",
      youtube: "Ver en YouTube",
      "podcast-rss": "Suscribirse al Podcast",
    };
    return esMap[channel] ?? channel;
  }
  const map: Record<ChannelName, string> = {
    threads: "Read on Threads",
    ghost: "Full article on VibeHub",
    tistory: "Read on Tistory",
    spotify: "Listen on Spotify",
    youtube: "Watch on YouTube",
    "podcast-rss": "Subscribe to Podcast",
  };
  return map[channel] ?? channel;
}
