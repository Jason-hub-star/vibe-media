/**
 * Spotify Metadata — 에피소드 메타데이터 JSON 생성.
 * 업로드는 Spotify for Podcasters에서 수동.
 */

import fs from "fs/promises";
import path from "path";
import {
  getPrimaryLocale,
  getVariantForLocale,
} from "./channel-types";
import type { BriefChannelMeta } from "./channel-types";

export interface SpotifyEpisodeMeta {
  title: string;
  description: string;
  /** 시즌 번호 */
  season?: number;
  /** 에피소드 번호 */
  episode?: number;
  /** 태그 */
  tags: string[];
  /** 오디오 파일 경로 */
  audioFilePath: string;
  /** 에피소드 길이 (초) */
  durationSec: number;
  /** 언어 */
  language: string;
  /** 발행일 (ISO) */
  publishDate: string;
}

/**
 * BriefChannelMeta → Spotify 에피소드 메타데이터 생성.
 */
export function buildSpotifyMeta(
  meta: BriefChannelMeta,
  audioPath: string,
  durationSec: number,
): SpotifyEpisodeMeta {
  const locale = getPrimaryLocale(meta);
  const variant = getVariantForLocale(meta, locale);

  return {
    title: variant?.title ?? meta.title,
    description: (variant?.markdownBody ?? meta.markdownBody).slice(0, 4000),
    tags: variant?.tags ?? meta.tags,
    audioFilePath: audioPath,
    durationSec,
    language: locale,
    publishDate: new Date().toISOString(),
  };
}

/**
 * metadata.json 파일로 저장.
 */
export async function writeSpotifyMetadata(
  outputDir: string,
  meta: SpotifyEpisodeMeta,
): Promise<string> {
  const filePath = path.join(outputDir, "spotify-metadata.json");
  await fs.writeFile(filePath, JSON.stringify(meta, null, 2), "utf-8");
  return filePath;
}
