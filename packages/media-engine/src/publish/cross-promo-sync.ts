/**
 * Cross-Promo Sync — Pass 2 (URL 상호 주입) + Pass 3 (YouTube 비동기).
 */

import type {
  ChannelName,
  ChannelPublisher,
  ChannelPublishResult,
  CrossPromoResult,
} from "./channel-types";
import { buildCrossPromoBlocks, buildPromoText } from "./promo-templates";

// ---------------------------------------------------------------------------
// Pass 2: 크로스 프로모션 주입
// ---------------------------------------------------------------------------

export interface CrossPromoSyncOptions {
  /** 채널별 Publisher 인스턴스 */
  publishers: Map<ChannelName, ChannelPublisher>;
  /** Pass 1 결과 (채널별 발행 URL) */
  publishedUrls: Partial<Record<ChannelName, string>>;
  /** 브리프 메타 */
  title: string;
  slug: string;
  /** dryRun */
  dryRun?: boolean;
}

/**
 * Pass 2: 각 채널에 크로스 프로모션 답글/블록 주입.
 * 모든 채널이 발행된 후 호출.
 */
export async function runCrossPromoSync(
  options: CrossPromoSyncOptions,
): Promise<CrossPromoResult[]> {
  const { publishers, publishedUrls, title, slug, dryRun } = options;
  const allBlocks = buildCrossPromoBlocks(publishedUrls);

  if (allBlocks.length < 2) {
    // 크로스프로모할 대상이 1개 이하면 skip
    return [];
  }

  const results: CrossPromoResult[] = [];

  const promises = Array.from(publishers.entries()).map(
    async ([channel, publisher]) => {
      const url = publishedUrls[channel];
      if (!url || !publisher.injectCrossPromo) {
        return;
      }

      if (dryRun) {
        const promoText = buildPromoText(channel, { title, slug, publishedUrls }, allBlocks);
        console.log(`[DRY RUN] Cross-promo for ${channel}: ${promoText.slice(0, 100)}...`);
        results.push({ channel, success: true });
        return;
      }

      try {
        const result = await publisher.injectCrossPromo(url, allBlocks);
        results.push(result);
      } catch (err) {
        results.push({
          channel,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
  );

  await Promise.allSettled(promises);
  return results;
}

// ---------------------------------------------------------------------------
// Pass 3: YouTube 비동기 크로스프로모 (video ID 등록 후)
// ---------------------------------------------------------------------------

export interface YouTubeLinkOptions {
  /** YouTube 비디오 URL */
  youtubeUrl: string;
  /** 기존 발행 URL에 YouTube 추가 */
  existingUrls: Partial<Record<ChannelName, string>>;
  /** 채널별 Publisher */
  publishers: Map<ChannelName, ChannelPublisher>;
  title: string;
  slug: string;
}

/**
 * Pass 3: YouTube 업로드 후 기존 채널에 YouTube 링크 추가.
 * YouTube는 수동 업로드이므로 video_id 등록 후 별도 호출.
 */
export async function linkYouTubeToChannels(
  options: YouTubeLinkOptions,
): Promise<CrossPromoResult[]> {
  const allUrls: Partial<Record<ChannelName, string>> = {
    ...options.existingUrls,
    youtube: options.youtubeUrl,
  };

  return runCrossPromoSync({
    publishers: options.publishers,
    publishedUrls: allUrls,
    title: options.title,
    slug: options.slug,
  });
}
