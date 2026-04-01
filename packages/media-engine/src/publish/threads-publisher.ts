/**
 * Threads Publishing API — 2단계(createContainer → publish) + 답글(Pass 2).
 * 참고 패턴: kie-client.ts (env auth + fetch + error throw)
 *
 * API 흐름:
 *   POST graph.threads.net/{user-id}/threads       (container 생성)
 *   POST graph.threads.net/{user-id}/threads_publish (발행)
 *   POST graph.threads.net/{user-id}/threads       (reply_to_id → 크로스프로모 답글)
 *
 * 환경변수: THREADS_USER_ID, THREADS_ACCESS_TOKEN
 */

import type { PublishPayload } from "../types";
import { THREADS_HANDLE } from "../brand";
import type {
  ChannelPublisher,
  ChannelPublishResult,
  CrossPromoBlock,
  CrossPromoResult,
} from "./channel-types";
import { fetchWithRetry } from "./fetch-with-retry";

const THREADS_API_BASE = "https://graph.threads.net";
const THREADS_MAX_LENGTH = 500;

interface ThreadsPublisherOptions {
  userId?: string;
  accessToken?: string;
}

export function createThreadsPublisher(
  options?: ThreadsPublisherOptions,
): ChannelPublisher {
  const userId = options?.userId ?? process.env.THREADS_USER_ID;
  const accessToken = options?.accessToken ?? process.env.THREADS_ACCESS_TOKEN;

  function assertCredentials(): { userId: string; accessToken: string } {
    if (!userId) throw new Error("THREADS_USER_ID not configured");
    if (!accessToken) throw new Error("THREADS_ACCESS_TOKEN not configured");
    return { userId, accessToken };
  }

  /** 텍스트를 Threads 500자 제한에 맞게 자르기 */
  function truncateText(text: string): string {
    if (text.length <= THREADS_MAX_LENGTH) return text;
    return text.slice(0, THREADS_MAX_LENGTH - 3) + "...";
  }

  /** Step 1: Container 생성 */
  async function createContainer(
    creds: { userId: string; accessToken: string },
    text: string,
    replyToId?: string,
  ): Promise<string> {
    const params = new URLSearchParams({
      media_type: "TEXT",
      text: truncateText(text),
      access_token: creds.accessToken,
    });
    if (replyToId) {
      params.set("reply_to_id", replyToId);
    }

    const res = await fetchWithRetry(
      `${THREADS_API_BASE}/${creds.userId}/threads`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Threads createContainer failed (${res.status}): ${body}`);
    }

    const data = (await res.json()) as { id?: string };
    if (!data.id) throw new Error("Threads createContainer returned no id");
    return data.id;
  }

  /** Step 2: Container 발행 */
  async function publishContainer(
    creds: { userId: string; accessToken: string },
    containerId: string,
  ): Promise<string> {
    const params = new URLSearchParams({
      creation_id: containerId,
      access_token: creds.accessToken,
    });

    const res = await fetchWithRetry(
      `${THREADS_API_BASE}/${creds.userId}/threads_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Threads publish failed (${res.status}): ${body}`);
    }

    const data = (await res.json()) as { id?: string };
    if (!data.id) throw new Error("Threads publish returned no id");
    return data.id;
  }

  /** 본문 생성: title + body 조합 */
  function buildPostText(payload: PublishPayload): string {
    const body = payload.markdownBody ?? payload.htmlBody ?? "";
    const tagLine =
      payload.tags && payload.tags.length > 0
        ? "\n\n" + payload.tags.map((t) => `#${t}`).join(" ")
        : "";
    return `${payload.title}\n\n${body}${tagLine}`;
  }

  // --- ChannelPublisher 구현 ---

  async function publish(
    payload: PublishPayload,
    opts?: { dryRun?: boolean },
  ): Promise<ChannelPublishResult> {
    if (opts?.dryRun) {
      const text = truncateText(buildPostText(payload));
      return {
        channel: "threads",
        success: true,
        publishedUrl: `https://www.threads.com/@${THREADS_HANDLE}/post/DRY_RUN`,
        publishedAt: new Date().toISOString(),
        error: `[DRY RUN] Would post: ${text.slice(0, 100)}...`,
      };
    }

    try {
      const creds = assertCredentials();
      const text = buildPostText(payload);
      const containerId = await createContainer(creds, text);
      const postId = await publishContainer(creds, containerId);

      return {
        channel: "threads",
        success: true,
        publishedUrl: `https://www.threads.com/@${THREADS_HANDLE}/post/${postId}`,
        publishedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        channel: "threads",
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async function injectCrossPromo(
    publishedUrl: string,
    promos: CrossPromoBlock[],
  ): Promise<CrossPromoResult> {
    try {
      const creds = assertCredentials();

      // Threads API에서 post ID로 답글을 달려면 약간의 전파 시간 필요
      await new Promise((r) => setTimeout(r, 3000));

      // publishedUrl에서 실제 media ID 조회 (URL의 마지막 segment는 media ID)
      const mediaId = publishedUrl.split("/").pop();
      if (!mediaId) throw new Error("Cannot extract media ID from URL");

      // media ID로 바로 reply (Threads API는 publish 반환값이 media ID)
      const promoText = promos
        .map((p) => `${p.text}\n${p.url}`)
        .join("\n\n");

      const containerId = await createContainer(creds, promoText, mediaId);
      await publishContainer(creds, containerId);

      return { channel: "threads", success: true };
    } catch (err) {
      return {
        channel: "threads",
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return {
    name: "threads",
    channel: "threads",
    publish,
    injectCrossPromo,
  };
}
