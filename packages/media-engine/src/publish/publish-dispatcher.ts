/**
 * Publish Dispatcher — 전체 채널 발행 오케스트레이션.
 *
 * Pass 1: 병렬 발행 (Promise.allSettled로 채널별 실패 격리)
 * Pass 2: 크로스 프로모션 주입
 * DB 기록 + Telegram 보고 (선택)
 *
 * 핵심: dryRun 지원, 채널별 실패가 전체를 중단시키지 않음.
 */

import type {
  ChannelConfig,
  ChannelName,
  ChannelPublisher,
  ChannelPublishResult,
  DispatchResult,
  PublishDispatchOptions,
} from "./channel-types";
import type { PublishPayload } from "../types";
import { runCrossPromoSync } from "./cross-promo-sync";

// ---------------------------------------------------------------------------
// Publisher Registry (lazy)
// ---------------------------------------------------------------------------

type PublisherFactory = () => ChannelPublisher;

const publisherRegistry = new Map<ChannelName, PublisherFactory>();

/** Publisher 팩토리 등록 */
export function registerPublisher(
  channel: ChannelName,
  factory: PublisherFactory,
): void {
  publisherRegistry.set(channel, factory);
}

/** 등록된 Publisher 인스턴스 가져오기 */
function getPublisher(channel: ChannelName): ChannelPublisher | null {
  const factory = publisherRegistry.get(channel);
  return factory ? factory() : null;
}

// ---------------------------------------------------------------------------
// BriefChannelMeta → PublishPayload 변환
// ---------------------------------------------------------------------------

function toPublishPayload(
  options: PublishDispatchOptions,
): PublishPayload {
  const meta = options.briefMeta;
  return {
    title: meta.title,
    markdownBody: meta.markdownBody,
    htmlBody: meta.htmlBody,
    tags: meta.tags,
    thumbnailUrl: meta.thumbnailUrls?.en,
    videoUrl: meta.videoUrls?.en,
  };
}

// ---------------------------------------------------------------------------
// Pass 1: 병렬 발행
// ---------------------------------------------------------------------------

async function runPass1(
  channels: ChannelConfig[],
  payload: PublishPayload,
  dryRun: boolean,
): Promise<{
  results: ChannelPublishResult[];
  publishers: Map<ChannelName, ChannelPublisher>;
  publishedUrls: Partial<Record<ChannelName, string>>;
}> {
  const publishers = new Map<ChannelName, ChannelPublisher>();
  const publishedUrls: Partial<Record<ChannelName, string>> = {};

  const promises = channels
    .filter((c) => c.enabled)
    .map(async (config): Promise<ChannelPublishResult> => {
      const publisher = getPublisher(config.name);
      if (!publisher) {
        return {
          channel: config.name,
          success: false,
          error: `No publisher registered for channel: ${config.name}`,
        };
      }

      publishers.set(config.name, publisher);
      const isDry = dryRun || config.dryRun;

      try {
        const result = await publisher.publish(payload, { dryRun: isDry });
        if (result.success && result.publishedUrl) {
          publishedUrls[config.name] = result.publishedUrl;
        }
        return result;
      } catch (err) {
        return {
          channel: config.name,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    });

  const settled = await Promise.allSettled(promises);
  const results = settled.map((s) =>
    s.status === "fulfilled"
      ? s.value
      : {
          channel: "threads" as ChannelName,
          success: false,
          error: s.reason instanceof Error ? s.reason.message : String(s.reason),
        },
  );

  return { results, publishers, publishedUrls };
}

// ---------------------------------------------------------------------------
// 메인 Dispatcher
// ---------------------------------------------------------------------------

/**
 * 전체 채널 발행 실행.
 * Pass 1 (병렬 발행) → Pass 2 (크로스프로모).
 */
export async function dispatchPublish(
  options: PublishDispatchOptions,
): Promise<DispatchResult> {
  const startTime = Date.now();
  const dryRun = options.dryRun ?? false;
  const payload = toPublishPayload(options);

  // Pass 1: 병렬 발행
  const { results, publishers, publishedUrls } = await runPass1(
    options.channels,
    payload,
    dryRun,
  );

  // Pass 2: 크로스 프로모션 (skipCrossPromo=true면 건너뜀)
  // Threads 등 일부 API는 포스트 생성 직후 media ID 조회가 안 되므로,
  // 본문 발행과 분리하여 별도 실행하는 것을 권장.
  let crossPromoResults: ChannelPublishResult[] = [];
  const successCount = Object.keys(publishedUrls).length;

  if (successCount >= 2 && !options.skipCrossPromo) {
    const promoResults = await runCrossPromoSync({
      publishers,
      publishedUrls,
      title: options.briefMeta.title,
      slug: options.briefMeta.slug,
      dryRun,
    });

    crossPromoResults = promoResults.map((r) => ({
      channel: r.channel,
      success: r.success,
      error: r.error,
      crossPromoInjected: r.success,
    }));
  }

  const durationMs = Date.now() - startTime;

  return {
    briefId: options.briefMeta.briefId,
    results,
    allSuccess: results.every((r) => r.success),
    crossPromoResults,
    durationMs,
  };
}
