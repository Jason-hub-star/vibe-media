/**
 * Instagram Reels Publisher — shorts.mp4를 Reels로 자동 발행.
 *
 * 사전 조건:
 *   - Meta Business 계정 + Facebook Page + Instagram Professional 계정 연결
 *   - Instagram Graph API 권한: instagram_basic, instagram_content_publish, pages_read_engagement
 *
 * 흐름:
 *   1. shorts.mp4를 공개 URL로 호스팅 (Supabase Storage public bucket 등)
 *   2. POST /{ig-user-id}/media → container 생성 (media_type: REELS)
 *   3. 폴링: GET /{container-id}?fields=status_code (FINISHED 대기)
 *   4. POST /{ig-user-id}/media_publish → 발행
 *
 * 환경변수:
 *   INSTAGRAM_USER_ID — IG Professional 계정 ID
 *   INSTAGRAM_ACCESS_TOKEN — Long-lived access token
 *
 * 비용: $0
 */

import type { PublishPayload } from "../types";
import type {
  ChannelPublisher,
  ChannelPublishResult,
} from "./channel-types";
import { fetchWithRetry } from "./fetch-with-retry";

const GRAPH_API = "https://graph.facebook.com/v21.0";

interface ContainerResponse {
  id: string;
}

interface ContainerStatusResponse {
  id: string;
  status_code: "EXPIRED" | "ERROR" | "FINISHED" | "IN_PROGRESS" | "PUBLISHED";
  status?: string;
}

interface PublishResponse {
  id: string;
}

/** IG container 생성 → 폴링 → 발행 */
async function publishReel(
  userId: string,
  accessToken: string,
  videoUrl: string,
  caption: string,
): Promise<{ mediaId: string; permalink: string }> {
  // 1. Container 생성
  const createParams = new URLSearchParams({
    media_type: "REELS",
    video_url: videoUrl,
    caption,
    access_token: accessToken,
  });

  const createResponse = await fetchWithRetry(
    `${GRAPH_API}/${userId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: createParams,
    },
  );

  if (!createResponse.ok) {
    const text = await createResponse.text();
    throw new Error(`Instagram container creation failed (${createResponse.status}): ${text}`);
  }

  const { id: containerId } = (await createResponse.json()) as ContainerResponse;
  console.log(`  Instagram: container created (${containerId})`);

  // 2. 폴링 — 비디오 처리 대기 (최대 5분)
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 10000)); // 10초 간격

    const statusResponse = await fetchWithRetry(
      `${GRAPH_API}/${containerId}?fields=status_code,status&access_token=${accessToken}`,
    );

    if (!statusResponse.ok) {
      console.warn(`  Instagram: container status check failed (${statusResponse.status}), retrying...`);
      continue;
    }

    const status = (await statusResponse.json()) as ContainerStatusResponse;
    console.log(`  Instagram: container status = ${status.status_code}`);

    if (status.status_code === "FINISHED") break;
    if (status.status_code === "ERROR" || status.status_code === "EXPIRED") {
      throw new Error(`Instagram container failed: ${status.status_code} — ${status.status}`);
    }
  }

  // 3. 발행
  const publishParams = new URLSearchParams({
    creation_id: containerId,
    access_token: accessToken,
  });

  const publishResponse = await fetchWithRetry(
    `${GRAPH_API}/${userId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: publishParams,
    },
  );

  if (!publishResponse.ok) {
    const text = await publishResponse.text();
    throw new Error(`Instagram publish failed (${publishResponse.status}): ${text}`);
  }

  const { id: mediaId } = (await publishResponse.json()) as PublishResponse;

  // 4. permalink 조회
  const mediaResponse = await fetchWithRetry(
    `${GRAPH_API}/${mediaId}?fields=permalink&access_token=${accessToken}`,
  );

  let permalink = `https://www.instagram.com/p/${mediaId}`;
  if (mediaResponse.ok) {
    const mediaData = (await mediaResponse.json()) as { permalink?: string };
    if (mediaData.permalink) permalink = mediaData.permalink;
  }

  return { mediaId, permalink };
}

export interface InstagramPublishContext {
  /** 공개 접근 가능한 비디오 URL (Supabase Storage public 등) */
  publicVideoUrl: string;
}

export function createInstagramPublisher(
  context: InstagramPublishContext,
): ChannelPublisher {
  function getCredentials() {
    const userId = process.env.INSTAGRAM_USER_ID;
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    if (!userId || !accessToken) {
      throw new Error("Instagram credentials not configured (INSTAGRAM_USER_ID, INSTAGRAM_ACCESS_TOKEN)");
    }
    return { userId, accessToken };
  }

  async function publish(
    payload: PublishPayload,
    opts?: { dryRun?: boolean },
  ): Promise<ChannelPublishResult> {
    if (opts?.dryRun) {
      return {
        channel: "instagram",
        success: true,
        publishedUrl: "https://www.instagram.com/reel/DRY_RUN_ID",
        publishedAt: new Date().toISOString(),
        error: "[DRY RUN] Would publish Reel to Instagram",
      };
    }

    try {
      const creds = getCredentials();

      // caption: title + summary + 해시태그
      const tags = (payload.tags ?? [])
        .slice(0, 10)
        .map((t) => `#${t.replace(/[\s-]+/g, "")}`)
        .join(" ");

      const caption = [
        payload.title,
        "",
        payload.markdownBody?.slice(0, 500) ?? "",
        "",
        tags,
        "",
        "#IA #InteligenciaArtificial #TechNews #VibeHub",
      ].join("\n");

      console.log("  Instagram: publishing Reel...");
      const result = await publishReel(
        creds.userId,
        creds.accessToken,
        context.publicVideoUrl,
        caption,
      );

      console.log(`  Instagram: Reel published → ${result.permalink}`);
      return {
        channel: "instagram",
        success: true,
        publishedUrl: result.permalink,
        publishedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        channel: "instagram",
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return {
    name: "instagram",
    channel: "instagram",
    publish,
  };
}
