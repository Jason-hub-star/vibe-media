/**
 * LinkedIn Publisher — Brief ES 요약을 LinkedIn 포스트로 자동 발행.
 *
 * 캐러셀(PDF)은 Phase 2.5에서 BriefCarousel.tsx 구현 후 추가.
 * 현재: 텍스트 + 이미지 포스트로 시작.
 *
 * 사전 조건:
 *   - LinkedIn App 생성 (developer.linkedin.com)
 *   - Community Management API 제품 추가
 *   - 3-legged OAuth 또는 수동 토큰 발급
 *
 * 환경변수:
 *   LINKEDIN_ACCESS_TOKEN — OAuth 2.0 access token
 *   LINKEDIN_PERSON_URN — urn:li:person:{id} (개인) 또는 urn:li:organization:{id}
 *
 * 비용: $0
 */

import type { PublishPayload } from "../types";
import type {
  ChannelPublisher,
  ChannelPublishResult,
} from "./channel-types";
import { fetchWithRetry } from "./fetch-with-retry";

const LINKEDIN_API = "https://api.linkedin.com/v2";
const LINKEDIN_REST_API = "https://api.linkedin.com/rest";

interface LinkedInCredentials {
  accessToken: string;
  personUrn: string;
}

/**
 * LinkedIn ugcPosts (v2) 텍스트 포스트 발행.
 */
async function postToLinkedIn(
  creds: LinkedInCredentials,
  text: string,
): Promise<{ postUrn: string }> {
  const body = {
    author: creds.personUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: {
          text,
        },
        shareMediaCategory: "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  const response = await fetchWithRetry(`${LINKEDIN_API}/ugcPosts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LinkedIn post failed (${response.status}): ${text}`);
  }

  const postUrn = response.headers.get("x-restli-id") ?? "";
  return { postUrn };
}

/**
 * LinkedIn Community Management API (REST) 텍스트 포스트 발행.
 * ugcPosts v2가 deprecated되면 이쪽으로 전환.
 */
async function postToLinkedInRest(
  creds: LinkedInCredentials,
  text: string,
): Promise<{ postUrn: string }> {
  const body = {
    author: creds.personUrn,
    commentary: text,
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
    },
    lifecycleState: "PUBLISHED",
  };

  const response = await fetchWithRetry(`${LINKEDIN_REST_API}/posts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": "202401",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`LinkedIn REST post failed (${response.status}): ${errText}`);
  }

  const postUrn = response.headers.get("x-restli-id") ?? "";
  return { postUrn };
}

// ---------------------------------------------------------------------------
// Publisher 팩토리
// ---------------------------------------------------------------------------

export function createLinkedInPublisher(): ChannelPublisher {
  function getCredentials(): LinkedInCredentials {
    const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
    const personUrn = process.env.LINKEDIN_PERSON_URN;
    if (!accessToken || !personUrn) {
      throw new Error("LinkedIn credentials not configured (LINKEDIN_ACCESS_TOKEN, LINKEDIN_PERSON_URN)");
    }
    return { accessToken, personUrn };
  }

  async function publish(
    payload: PublishPayload,
    opts?: { dryRun?: boolean },
  ): Promise<ChannelPublishResult> {
    if (opts?.dryRun) {
      return {
        channel: "linkedin",
        success: true,
        publishedUrl: "https://www.linkedin.com/feed/update/DRY_RUN_ID",
        publishedAt: new Date().toISOString(),
        error: "[DRY RUN] Would post to LinkedIn",
      };
    }

    try {
      const creds = getCredentials();

      // 포스트 텍스트: title + summary (LinkedIn 3,000자 제한)
      const summary = payload.markdownBody ?? payload.htmlBody ?? "";
      const tags = (payload.tags ?? [])
        .slice(0, 5)
        .map((t) => `#${t.replace(/[\s-]+/g, "")}`)
        .join(" ");

      const postText = [
        payload.title,
        "",
        summary.slice(0, 2000),
        "",
        tags,
        "",
        "#IA #InteligenciaArtificial #TechNews #VibeHub",
      ].join("\n");

      console.log("  LinkedIn: posting...");

      // REST API 우선 시도, 실패 시 ugcPosts v2 fallback
      let postUrn: string;
      try {
        const result = await postToLinkedInRest(creds, postText);
        postUrn = result.postUrn;
      } catch {
        console.log("  LinkedIn: REST API failed, falling back to ugcPosts v2...");
        const result = await postToLinkedIn(creds, postText);
        postUrn = result.postUrn;
      }

      // URN → URL 변환 (urn:li:share:123 → /feed/update/urn:li:share:123)
      const postUrl = postUrn
        ? `https://www.linkedin.com/feed/update/${postUrn}`
        : "https://www.linkedin.com/in/me/recent-activity/";

      console.log(`  LinkedIn: posted → ${postUrl}`);

      return {
        channel: "linkedin",
        success: true,
        publishedUrl: postUrl,
        publishedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        channel: "linkedin",
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return {
    name: "linkedin",
    channel: "linkedin",
    publish,
  };
}
