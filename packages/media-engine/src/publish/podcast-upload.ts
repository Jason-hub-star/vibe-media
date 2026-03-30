/**
 * Podcast Upload — MP3 + feed.xml을 Supabase Storage public bucket에 업로드.
 *
 * 흐름:
 *   1. WAV → ffmpeg MP3 변환 (192kbps, loudnorm -16 LUFS)
 *   2. MP3를 Supabase Storage `podcast` bucket에 업로드
 *   3. feed.xml 갱신 + 업로드
 *   4. 공개 URL 반환 → Spotify가 자동 감지
 *
 * Supabase Storage public URL 패턴:
 *   https://{project-ref}.supabase.co/storage/v1/object/public/{bucket}/{path}
 *
 * 비용: $0 (Supabase 무료 1GB)
 */

import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execFileAsync = promisify(execFile);

const SUPABASE_PROJECT_REF = "hzxsropbcjfywmospobb";
const PODCAST_BUCKET = "podcast";

function getSupabasePublicUrl(objectPath: string): string {
  return `https://${SUPABASE_PROJECT_REF}.supabase.co/storage/v1/object/public/${PODCAST_BUCKET}/${objectPath}`;
}

function getSupabaseStorageApiUrl(objectPath: string): string {
  return `https://${SUPABASE_PROJECT_REF}.supabase.co/storage/v1/object/${PODCAST_BUCKET}/${objectPath}`;
}

// ---------------------------------------------------------------------------
// WAV → MP3 변환
// ---------------------------------------------------------------------------

export async function convertWavToMp3(
  wavPath: string,
  mp3Path: string,
): Promise<{ durationSec: number; fileSizeBytes: number }> {
  await execFileAsync("ffmpeg", [
    "-y", "-i", wavPath,
    "-af", "loudnorm=I=-16:TP=-1.5",
    "-c:a", "libmp3lame", "-b:a", "192k",
    mp3Path,
  ]);

  const stat = await fs.stat(mp3Path);

  // duration 추출
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "quiet",
    "-show_entries", "format=duration",
    "-of", "csv=p=0",
    mp3Path,
  ]);
  const durationSec = parseFloat(stdout.trim()) || 0;

  return { durationSec, fileSizeBytes: stat.size };
}

/** 초 → HH:MM:SS */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Supabase Storage 업로드
// ---------------------------------------------------------------------------

async function uploadToSupabaseStorage(
  objectPath: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");

  const url = getSupabaseStorageApiUrl(objectPath);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: new Uint8Array(buffer),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase Storage upload failed (${response.status}): ${text}`);
  }

  return getSupabasePublicUrl(objectPath);
}

// ---------------------------------------------------------------------------
// 메인: MP3 업로드 + feed.xml 갱신
// ---------------------------------------------------------------------------

export interface PodcastUploadOptions {
  /** WAV 음성 파일 경로 */
  wavPath: string;
  /** Brief slug (파일명에 사용) */
  slug: string;
  /** 에피소드 제목 */
  title: string;
  /** 에피소드 설명 */
  description: string;
  /** 언어 (기본: "es") */
  language?: string;
  /** 로컬 feed.xml 경로 (갱신용) */
  feedDir: string;
}

export interface PodcastUploadResult {
  /** MP3 공개 URL */
  mp3Url: string;
  /** feed.xml 공개 URL */
  feedUrl: string;
  /** 에피소드 길이 (초) */
  durationSec: number;
  /** MP3 파일 크기 (bytes) */
  fileSizeBytes: number;
}

export async function uploadPodcastEpisode(
  options: PodcastUploadOptions,
): Promise<PodcastUploadResult> {
  const lang = options.language ?? "es";
  const mp3Path = options.wavPath.replace(/\.wav$/, ".mp3");

  // 1. WAV → MP3 변환
  console.log(`  Podcast: converting WAV → MP3...`);
  const { durationSec, fileSizeBytes } = await convertWavToMp3(options.wavPath, mp3Path);
  console.log(`  Podcast: ${formatDuration(durationSec)}, ${(fileSizeBytes / 1024).toFixed(0)} KB`);

  // 2. MP3 업로드
  const mp3Buffer = await fs.readFile(mp3Path);
  const mp3ObjectPath = `episodes/${lang}/${options.slug}.mp3`;
  console.log(`  Podcast: uploading MP3 → ${mp3ObjectPath}...`);
  const mp3Url = await uploadToSupabaseStorage(mp3ObjectPath, mp3Buffer, "audio/mpeg");
  console.log(`  Podcast: ${mp3Url}`);

  // 3. feed.xml 로컬 갱신은 podcast-rss-publisher.ts가 담당
  //    여기서는 feed.xml도 업로드
  const feedPath = path.join(options.feedDir, "feed.xml");
  const feedUrl = getSupabasePublicUrl(`feed-${lang}.xml`);

  try {
    const feedBuffer = await fs.readFile(feedPath);
    console.log(`  Podcast: uploading feed.xml...`);
    await uploadToSupabaseStorage(`feed-${lang}.xml`, feedBuffer, "application/rss+xml");
    console.log(`  Podcast: ${feedUrl}`);
  } catch {
    console.log(`  Podcast: feed.xml not found locally, skipping upload`);
  }

  return { mp3Url, feedUrl, durationSec, fileSizeBytes };
}
