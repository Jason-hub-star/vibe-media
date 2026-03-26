/**
 * Ghost Publisher — 스텁 (인터페이스 + TODO).
 * Ghost Admin API를 통해 포스트 발행.
 */

import type { PublishPayload } from "../types";
import type {
  ChannelPublisher,
  ChannelPublishResult,
  CrossPromoBlock,
  CrossPromoResult,
} from "./channel-types";

/** TODO: Ghost Admin API 구현 시 환경변수: GHOST_URL, GHOST_ADMIN_KEY */

export function createGhostPublisher(): ChannelPublisher {
  async function publish(
    payload: PublishPayload,
    opts?: { dryRun?: boolean },
  ): Promise<ChannelPublishResult> {
    // TODO: Ghost Admin API 구현
    return {
      channel: "ghost",
      success: false,
      error: "Ghost publisher not yet implemented",
    };
  }

  async function injectCrossPromo(
    publishedUrl: string,
    promos: CrossPromoBlock[],
  ): Promise<CrossPromoResult> {
    // TODO: Ghost post update API로 크로스프로모 블록 추가
    return {
      channel: "ghost",
      success: false,
      error: "Ghost cross-promo not yet implemented",
    };
  }

  return {
    name: "ghost",
    channel: "ghost",
    publish,
    injectCrossPromo,
  };
}
