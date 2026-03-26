/**
 * Audiogram 렌더링 고수준 래퍼.
 * render-spawn.ts를 호출하여 BriefAudiogram Composition 렌더.
 */

import path from "path";
import { runRemotionRender } from "../render-spawn";
import type { BriefAudiogramProps, AudigramSubtitle } from "./BriefAudiogram";
import { parseSrt } from "../stt/srt-utils";
import fs from "fs/promises";

export interface RenderAudiogramOptions {
  /** 오디오 파일 경로 */
  audioPath: string;
  /** SRT 자막 파일 경로 */
  srtPath: string;
  /** 출력 mp4 경로 */
  outputPath: string;
  /** 브리프 제목 */
  title: string;
  /** 커버 이미지 경로 (선택) */
  coverImagePath?: string;
  /** FPS (기본: 30) */
  fps?: number;
  /** 전체 프레임 수 (오디오 길이 * fps) */
  durationInFrames?: number;
}

/** SRT 타임코드 → 프레임 번호 */
function timeToFrame(time: string, fps: number): number {
  // "00:01:23,456" → 초
  const parts = time.replace(",", ".").split(":");
  const hours = parseFloat(parts[0]);
  const minutes = parseFloat(parts[1]);
  const seconds = parseFloat(parts[2]);
  return Math.round((hours * 3600 + minutes * 60 + seconds) * fps);
}

/** SRT 파일 → AudigramSubtitle 배열 변환 */
async function srtToSubtitles(
  srtPath: string,
  fps: number,
): Promise<AudigramSubtitle[]> {
  const content = await fs.readFile(srtPath, "utf-8");
  const entries = parseSrt(content);

  return entries.map((e) => ({
    startFrame: timeToFrame(e.startTime, fps),
    endFrame: timeToFrame(e.endTime, fps),
    text: e.text,
  }));
}

/**
 * Audiogram mp4 렌더링.
 * SRT 파일을 읽어 자막 데이터로 변환 후 Remotion Composition 렌더.
 */
export async function renderAudiogram(
  options: RenderAudiogramOptions,
): Promise<void> {
  const fps = options.fps ?? 30;
  const subtitles = await srtToSubtitles(options.srtPath, fps);

  const inputProps: BriefAudiogramProps = {
    audioSrc: options.audioPath,
    coverImageSrc: options.coverImagePath,
    subtitles,
    title: options.title,
  };

  await runRemotionRender({
    compositionId: "BriefAudiogram",
    outputPath: options.outputPath,
    inputProps: inputProps as unknown as Record<string, unknown>,
    entryPoint: path.resolve(__dirname, "index.ts"),
    codec: "h264",
    ...(options.durationInFrames
      ? {} // durationInFrames는 composition에서 props로 제어
      : {}),
  });
}
