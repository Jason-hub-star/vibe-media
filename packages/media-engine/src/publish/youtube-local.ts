/**
 * YouTube Local — mp4 + metadata.json 로컬 저장 (완전 구현).
 * 업로드는 YouTube Studio에서 운영자 수동.
 */

import fs from "fs/promises";
import path from "path";
import type { PublishPayload } from "../types";
import { BRAND_NAME } from "../brand";
import type {
  ChannelPublisher,
  ChannelPublishResult,
} from "./channel-types";

export interface YouTubeMetadata {
  title: string;
  description: string;
  tags: string[];
  /** 카테고리 ID (22 = People & Blogs) */
  categoryId: string;
  /** 기본 언어 */
  defaultLanguage: string;
  /** 공개 상태 ("public" | "unlisted" | "private") */
  privacyStatus: string;
  /** 비디오 파일 경로 */
  videoFilePaths: Record<string, string>;
  /** 썸네일 파일 경로 */
  thumbnailFilePaths: Record<string, string>;
  /** 발행 예정일 */
  publishAt?: string;
}

export interface YouTubeLocalOptions {
  /** 출력 디렉토리 */
  outputDir: string;
  /** 언어별 비디오 파일 경로 */
  videoFiles: Record<string, string>;
  /** 언어별 썸네일 파일 경로 */
  thumbnailFiles?: Record<string, string>;
  /** 카테고리 ID (기본: "22") */
  categoryId?: string;
  /** 기본 언어 (기본: "en") */
  defaultLanguage?: string;
}

/**
 * YouTube 메타데이터 JSON 생성 + 로컬 저장.
 */
export async function prepareYouTubeUpload(
  payload: PublishPayload,
  options: YouTubeLocalOptions,
): Promise<string> {
  const meta: YouTubeMetadata = {
    title: payload.title,
    description: buildYouTubeDescription(payload),
    tags: payload.tags ?? [],
    categoryId: options.categoryId ?? "22",
    defaultLanguage: options.defaultLanguage ?? "en",
    privacyStatus: "unlisted",
    videoFilePaths: options.videoFiles,
    thumbnailFilePaths: options.thumbnailFiles ?? {},
    publishAt: payload.scheduledAt?.toISOString(),
  };

  const metadataPath = path.join(options.outputDir, "youtube-metadata.json");
  await fs.writeFile(metadataPath, JSON.stringify(meta, null, 2), "utf-8");
  return metadataPath;
}

function buildYouTubeDescription(payload: PublishPayload): string {
  const body = payload.markdownBody ?? payload.htmlBody ?? "";
  const tags =
    payload.tags && payload.tags.length > 0
      ? "\n\n" + payload.tags.map((t) => `#${t}`).join(" ")
      : "";
  return `${body}${tags}\n\n---\nPowered by ${BRAND_NAME}`;
}

/**
 * YouTube Local Publisher — 로컬 메타데이터 생성용.
 * 실제 업로드는 하지 않고 metadata.json만 생성.
 */
export function createYouTubeLocalPublisher(
  outputDir: string,
): ChannelPublisher {
  async function publish(
    payload: PublishPayload,
    opts?: { dryRun?: boolean },
  ): Promise<ChannelPublishResult> {
    if (opts?.dryRun) {
      return {
        channel: "youtube",
        success: true,
        publishedUrl: `file://${outputDir}/youtube-metadata.json`,
        publishedAt: new Date().toISOString(),
        error: "[DRY RUN] Would generate YouTube metadata",
      };
    }

    try {
      await fs.mkdir(outputDir, { recursive: true });
      const metadataPath = await prepareYouTubeUpload(payload, {
        outputDir,
        videoFiles: {},
      });

      return {
        channel: "youtube",
        success: true,
        publishedUrl: `file://${metadataPath}`,
        publishedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        channel: "youtube",
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return {
    name: "youtube",
    channel: "youtube",
    publish,
  };
}
