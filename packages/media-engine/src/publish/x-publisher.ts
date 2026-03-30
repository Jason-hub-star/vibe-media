/**
 * X/Twitter Publisher — Brief ES 요약을 스레드로 자동 발행.
 *
 * Free 티어: 1,500 트윗/월, 17,000 읽기/월.
 * 첫 트윗에 shorts.mp4 첨부 (Media Upload API v1.1).
 * 280자 스페인어 포맷팅 + 스레드 자동 분할.
 *
 * 환경변수:
 *   X_API_KEY, X_API_SECRET — API v2 Consumer credentials
 *   X_ACCESS_TOKEN, X_ACCESS_SECRET — User OAuth 1.0a
 *   X_BEARER_TOKEN — App-only bearer (읽기 전용, 발행엔 불필요)
 *
 * 비용: $0 (Free 티어)
 */

import crypto from "crypto";
import fs from "fs/promises";
import type { PublishPayload } from "../types";
import type {
  ChannelPublisher,
  ChannelPublishResult,
} from "./channel-types";
import { fetchWithRetry } from "./fetch-with-retry";

const X_API_V2 = "https://api.twitter.com/2/tweets";
const X_UPLOAD_V1 = "https://upload.twitter.com/1.1/media/upload.json";

interface XCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
}

// ---------------------------------------------------------------------------
// OAuth 1.0a 서명 (X API v2 + Media Upload v1.1 공통)
// ---------------------------------------------------------------------------

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  creds: XCredentials,
): string {
  const sortedKeys = Object.keys(params).sort();
  const paramStr = sortedKeys.map((k) => `${percentEncode(k)}=${percentEncode(params[k]!)}`).join("&");
  const baseStr = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(paramStr)}`;
  const signingKey = `${percentEncode(creds.apiSecret)}&${percentEncode(creds.accessSecret)}`;
  return crypto.createHmac("sha1", signingKey).update(baseStr).digest("base64");
}

function buildOAuthHeader(
  method: string,
  url: string,
  creds: XCredentials,
  extraParams?: Record<string, string>,
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: creds.apiKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: creds.accessToken,
    oauth_version: "1.0",
  };

  const allParams = { ...oauthParams, ...(extraParams ?? {}) };
  oauthParams.oauth_signature = generateOAuthSignature(method, url, allParams, creds);

  const headerParts = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k]!)}"`)
    .join(", ");

  return `OAuth ${headerParts}`;
}

// ---------------------------------------------------------------------------
// 텍스트 분할 (280자 스레드)
// ---------------------------------------------------------------------------

const MAX_TWEET_LENGTH = 280;

/** Brief 요약을 280자 트윗 청크로 분할 */
export function splitIntoTweets(
  text: string,
  maxLen: number = MAX_TWEET_LENGTH,
): string[] {
  if (text.length <= maxLen) return [text];

  const sentences = text.split(/(?<=[.!?])\s+/);
  const tweets: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length <= maxLen - 6) {
      // -6 for " (n/N)" suffix
      current = candidate;
    } else {
      if (current) tweets.push(current);
      current = sentence.length > maxLen ? sentence.slice(0, maxLen - 3) + "..." : sentence;
    }
  }
  if (current) tweets.push(current);

  // 번호 매기기 (2개 이상)
  if (tweets.length > 1) {
    return tweets.map((t, i) => `${t} (${i + 1}/${tweets.length})`);
  }
  return tweets;
}

// ---------------------------------------------------------------------------
// Media Upload (v1.1 chunked)
// ---------------------------------------------------------------------------

async function uploadMediaV1(
  videoPath: string,
  creds: XCredentials,
): Promise<string> {
  const videoBuffer = await fs.readFile(videoPath);
  const totalBytes = videoBuffer.length;

  // INIT
  const initParams = {
    command: "INIT",
    total_bytes: String(totalBytes),
    media_type: "video/mp4",
    media_category: "tweet_video",
  };

  const initResponse = await fetchWithRetry(X_UPLOAD_V1, {
    method: "POST",
    headers: {
      Authorization: buildOAuthHeader("POST", X_UPLOAD_V1, creds, initParams),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(initParams),
  });

  if (!initResponse.ok) {
    const text = await initResponse.text();
    throw new Error(`X Media INIT failed (${initResponse.status}): ${text}`);
  }

  const { media_id_string: mediaId } = (await initResponse.json()) as { media_id_string: string };

  // APPEND (5MB 청크)
  const CHUNK_SIZE = 5 * 1024 * 1024;
  let segmentIndex = 0;
  let offset = 0;

  while (offset < totalBytes) {
    const chunk = videoBuffer.subarray(offset, offset + CHUNK_SIZE);
    const boundary = `----FormBoundary${crypto.randomBytes(8).toString("hex")}`;

    const bodyParts = [
      `--${boundary}\r\nContent-Disposition: form-data; name="command"\r\n\r\nAPPEND`,
      `--${boundary}\r\nContent-Disposition: form-data; name="media_id"\r\n\r\n${mediaId}`,
      `--${boundary}\r\nContent-Disposition: form-data; name="segment_index"\r\n\r\n${segmentIndex}`,
      `--${boundary}\r\nContent-Disposition: form-data; name="media_data"\r\n\r\n${chunk.toString("base64")}`,
      `--${boundary}--`,
    ];
    const body = bodyParts.join("\r\n");

    const appendResponse = await fetchWithRetry(X_UPLOAD_V1, {
      method: "POST",
      headers: {
        Authorization: buildOAuthHeader("POST", X_UPLOAD_V1, creds),
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });

    if (!appendResponse.ok) {
      const text = await appendResponse.text();
      throw new Error(`X Media APPEND failed (${appendResponse.status}): ${text}`);
    }

    offset += CHUNK_SIZE;
    segmentIndex++;
  }

  // FINALIZE
  const finalParams = { command: "FINALIZE", media_id: mediaId };
  const finalResponse = await fetchWithRetry(X_UPLOAD_V1, {
    method: "POST",
    headers: {
      Authorization: buildOAuthHeader("POST", X_UPLOAD_V1, creds, finalParams),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(finalParams),
  });

  if (!finalResponse.ok) {
    const text = await finalResponse.text();
    throw new Error(`X Media FINALIZE failed (${finalResponse.status}): ${text}`);
  }

  // 비디오 처리 대기 (STATUS 폴링)
  const finalData = (await finalResponse.json()) as {
    media_id_string: string;
    processing_info?: { state: string; check_after_secs: number };
  };

  if (finalData.processing_info) {
    const MAX_POLL_ATTEMPTS = 60;
    let state = finalData.processing_info.state;
    let pollCount = 0;
    while ((state === "pending" || state === "in_progress") && pollCount < MAX_POLL_ATTEMPTS) {
      pollCount++;
      const waitSecs = finalData.processing_info.check_after_secs ?? 5;
      await new Promise((r) => setTimeout(r, waitSecs * 1000));

      const statusParams = { command: "STATUS", media_id: mediaId };
      const statusResponse = await fetchWithRetry(
        `${X_UPLOAD_V1}?${new URLSearchParams(statusParams)}`,
        {
          headers: {
            Authorization: buildOAuthHeader("GET", X_UPLOAD_V1, creds, statusParams),
          },
        },
      );
      const statusData = (await statusResponse.json()) as {
        processing_info?: { state: string; check_after_secs: number; error?: { message: string } };
      };

      state = statusData.processing_info?.state ?? "succeeded";
      if (state === "failed") {
        throw new Error(`X Media processing failed: ${statusData.processing_info?.error?.message}`);
      }
    }
    if (pollCount >= MAX_POLL_ATTEMPTS && (state === "pending" || state === "in_progress")) {
      throw new Error(`X Media processing timed out after ${MAX_POLL_ATTEMPTS} polls`);
    }
  }

  return mediaId;
}

// ---------------------------------------------------------------------------
// Tweet 발행 (v2)
// ---------------------------------------------------------------------------

async function postTweet(
  text: string,
  creds: XCredentials,
  opts?: { replyToId?: string; mediaId?: string },
): Promise<{ id: string }> {
  const body: Record<string, unknown> = { text };
  if (opts?.replyToId) body.reply = { in_reply_to_tweet_id: opts.replyToId };
  if (opts?.mediaId) body.media = { media_ids: [opts.mediaId] };

  const response = await fetchWithRetry(X_API_V2, {
    method: "POST",
    headers: {
      Authorization: buildOAuthHeader("POST", X_API_V2, creds),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`X tweet post failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { data: { id: string } };
  return { id: data.data.id };
}

// ---------------------------------------------------------------------------
// Publisher 팩토리
// ---------------------------------------------------------------------------

export interface XPublishContext {
  /** shorts.mp4 경로 (첫 트윗에 첨부, 선택) */
  videoFilePath?: string;
}

export function createXPublisher(context?: XPublishContext): ChannelPublisher {
  function getCredentials(): XCredentials {
    const apiKey = process.env.X_API_KEY;
    const apiSecret = process.env.X_API_SECRET;
    const accessToken = process.env.X_ACCESS_TOKEN;
    const accessSecret = process.env.X_ACCESS_SECRET;
    if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
      throw new Error("X/Twitter credentials not configured (X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET)");
    }
    return { apiKey, apiSecret, accessToken, accessSecret };
  }

  async function publish(
    payload: PublishPayload,
    opts?: { dryRun?: boolean },
  ): Promise<ChannelPublishResult> {
    if (opts?.dryRun) {
      return {
        channel: "x",
        success: true,
        publishedUrl: "https://x.com/i/status/DRY_RUN_ID",
        publishedAt: new Date().toISOString(),
        error: "[DRY RUN] Would post thread to X/Twitter",
      };
    }

    try {
      const creds = getCredentials();

      // 텍스트 준비: title + summary/body
      const summary = payload.markdownBody ?? payload.htmlBody ?? "";
      const fullText = `${payload.title}\n\n${summary}`;
      const tweets = splitIntoTweets(fullText);

      // 영상 업로드 (첫 트윗에 첨부)
      let mediaId: string | undefined;
      if (context?.videoFilePath) {
        try {
          console.log("  X: uploading video...");
          mediaId = await uploadMediaV1(context.videoFilePath, creds);
          console.log(`  X: video uploaded (media_id: ${mediaId})`);
        } catch (err) {
          console.warn(`  X: video upload failed, posting text only: ${err instanceof Error ? err.message : err}`);
        }
      }

      // 스레드 발행 (reply_to 체이닝)
      let firstTweetId: string | undefined;
      let lastReplyId: string | undefined;

      for (let i = 0; i < tweets.length; i++) {
        const result = await postTweet(tweets[i]!, creds, {
          replyToId: lastReplyId,
          mediaId: i === 0 ? mediaId : undefined,
        });

        if (i === 0) firstTweetId = result.id;
        lastReplyId = result.id;
        console.log(`  X: tweet ${i + 1}/${tweets.length} posted (${result.id})`);
      }

      const tweetUrl = `https://x.com/i/status/${firstTweetId}`;
      return {
        channel: "x",
        success: true,
        publishedUrl: tweetUrl,
        publishedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        channel: "x",
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return {
    name: "x",
    channel: "x",
    publish,
  };
}
