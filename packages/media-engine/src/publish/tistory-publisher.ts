/**
 * Tistory Publisher — 스텁.
 * Tistory Open API를 통해 포스트 발행.
 */

import type { PublishPayload } from "../types";
import type {
  ChannelPublisher,
  ChannelPublishResult,
  CrossPromoBlock,
  CrossPromoResult,
} from "./channel-types";

/** TODO: Tistory API 구현 시 환경변수: TISTORY_ACCESS_TOKEN, TISTORY_BLOG_NAME */

export function createTistoryPublisher(): ChannelPublisher {
  async function publish(
    payload: PublishPayload,
    opts?: { dryRun?: boolean },
  ): Promise<ChannelPublishResult> {
    // TODO: Tistory Open API 구현
    return {
      channel: "tistory",
      success: false,
      error: "Tistory publisher not yet implemented",
    };
  }

  async function injectCrossPromo(
    publishedUrl: string,
    promos: CrossPromoBlock[],
  ): Promise<CrossPromoResult> {
    // TODO: Tistory post update로 크로스프로모 블록 추가
    return {
      channel: "tistory",
      success: false,
      error: "Tistory cross-promo not yet implemented",
    };
  }

  return {
    name: "tistory",
    channel: "tistory",
    publish,
    injectCrossPromo,
  };
}
