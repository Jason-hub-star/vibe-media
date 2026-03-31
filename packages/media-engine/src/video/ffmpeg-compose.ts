/**
 * ffmpeg Composer — Remotion 렌더링 결과 + 음성 + BGM 합성.
 *
 * filter_complex로 voice loudnorm + BGM volume/fade 적용 후 amix.
 */

import fs from "fs/promises";
import path from "path";
import { spawnAsync, measureDuration } from "../spawn-async";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ComposeVideoOptions {
  /** Remotion 렌더링된 무음 비디오 */
  visualPath: string;
  /** 나레이션 음성 (WAV) */
  voicePath: string;
  /** BGM 파일 (MP3) */
  bgmPath: string;
  /** 최종 출력 경로 */
  outputPath: string;
  /** BGM 볼륨 (기본: 0.25) */
  bgmVolume?: number;
  /** BGM 페이드아웃 초 (기본: 3) */
  fadeOutSec?: number;
  /** 음성 길이 (초) — 있으면 BGM fade-out이 끝에 맞춰짐 */
  voiceDurationSec?: number;
}

export interface ComposeVideoResult {
  outputPath: string;
  durationSec: number;
  success: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// BGM Picker
// ---------------------------------------------------------------------------

/**
 * assets/bgm/ 디렉토리에서 랜덤 MP3 선택.
 */
export async function pickRandomBgm(bgmDir: string): Promise<string> {
  const files = await fs.readdir(bgmDir);
  const mp3s = files.filter((f) => f.endsWith(".mp3"));
  if (mp3s.length === 0) throw new Error(`No MP3 files found in ${bgmDir}`);

  const pick = mp3s[Math.floor(Math.random() * mp3s.length)]!;
  return path.join(bgmDir, pick);
}

// ---------------------------------------------------------------------------
// ffmpeg arg builder
// ---------------------------------------------------------------------------

/**
 * ffmpeg 인자 배열 빌드 (테스트 가능하도록 분리).
 *
 * BGM fade-out은 voice 끝에 맞추려면 voiceDurationSec가 필요.
 * 없으면 amix duration=first + dropout_transition으로 자연 페이드.
 */
export function buildFfmpegArgs(
  options: ComposeVideoOptions & { voiceDurationSec?: number },
): string[] {
  const bgmVolume = options.bgmVolume ?? 0.25;
  const fadeOutSec = options.fadeOutSec ?? 3;
  const voiceDur = options.voiceDurationSec;

  // BGM fade-out: voice duration이 있으면 끝 N초 전부터, 없으면 dropout_transition에 의존
  const fadeStart = voiceDur ? Math.max(0, voiceDur - fadeOutSec) : 0;
  const bgmFade = voiceDur
    ? `afade=t=out:st=${fadeStart}:d=${fadeOutSec}`
    : `afade=t=out:st=0:d=${fadeOutSec}`;

  // filter_complex:
  // [1:a] voice loudnorm
  // [2:a] BGM volume + fade out
  // amix 합성
  const filterComplex = [
    `[1:a]loudnorm=I=-16:TP=-1.5:LRA=11[voice]`,
    `[2:a]volume=${bgmVolume},${bgmFade}[bgm]`,
    `[voice][bgm]amix=inputs=2:duration=first:dropout_transition=${fadeOutSec}[aout]`,
  ].join(";");

  return [
    "-i", options.visualPath,    // 0: video (Remotion)
    "-i", options.voicePath,     // 1: voice (TTS WAV)
    "-i", options.bgmPath,       // 2: BGM (MP3)
    "-filter_complex", filterComplex,
    "-map", "0:v",
    "-map", "[aout]",
    "-c:v", "copy",
    "-c:a", "aac",
    "-b:a", "192k",
    "-shortest",
    "-y", options.outputPath,
  ];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/**
 * Remotion 비디오 + 음성 + BGM → 최종 MP4 합성.
 */
export async function composeVideo(
  options: ComposeVideoOptions,
): Promise<ComposeVideoResult> {
  try {
    const args = buildFfmpegArgs(options);

    await spawnAsync("ffmpeg", args, {
      timeout: 300_000, // 5분
    });

    const durationSec = await measureDuration(options.outputPath);

    return {
      outputPath: options.outputPath,
      durationSec,
      success: true,
    };
  } catch (err) {
    return {
      outputPath: options.outputPath,
      durationSec: 0,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
