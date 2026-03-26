/**
 * Whisper STT — @remotion/install-whisper-cpp 활용, SRT 생성.
 */

import fs from "fs/promises";
import path from "path";
import { spawnAsync } from "../spawn-async";

export interface WhisperOptions {
  /** whisper.cpp 모델 (기본: "base") */
  model?: string;
  /** 언어 (기본: "en") */
  language?: string;
  /** whisper.cpp 바이너리 경로 (기본: "whisper-cpp") */
  binaryPath?: string;
  /** 모델 경로 (기본: "models/ggml-{model}.bin") */
  modelPath?: string;
}

export interface WhisperResult {
  /** SRT 파일 경로 */
  srtPath: string;
  /** 원본 언어 */
  language: string;
  success: boolean;
  error?: string;
}

/**
 * 오디오 파일 → WAV 변환 (whisper.cpp는 16kHz mono WAV 필요)
 */
async function convertToWav(inputPath: string, outputDir: string): Promise<string> {
  const wavPath = path.join(outputDir, "whisper-input.wav");
  await spawnAsync("ffmpeg", [
    "-i", inputPath,
    "-ar", "16000",
    "-ac", "1",
    "-c:a", "pcm_s16le",
    "-y", wavPath,
  ]);
  return wavPath;
}

/**
 * whisper.cpp로 오디오 → SRT 자막 생성.
 */
export async function transcribeToSrt(
  audioPath: string,
  outputDir: string,
  options?: WhisperOptions,
): Promise<WhisperResult> {
  const model = options?.model ?? "base";
  const language = options?.language ?? "en";

  try {
    // WAV 변환
    const wavPath = await convertToWav(audioPath, outputDir);

    // whisper.cpp 실행
    const binaryPath = options?.binaryPath ?? "whisper-cpp";
    const modelPath = options?.modelPath ?? `models/ggml-${model}.bin`;
    const srtOutputBase = path.join(outputDir, `subtitles-${language}`);

    await spawnAsync(binaryPath, [
      "-m", modelPath,
      "-f", wavPath,
      "-l", language,
      "--output-srt",
      "--output-file", srtOutputBase,
    ]);

    const srtPath = `${srtOutputBase}.srt`;

    // SRT 파일 존재 확인
    await fs.access(srtPath);

    // 임시 WAV 삭제
    await fs.unlink(wavPath).catch(() => {});

    return { srtPath, language, success: true };
  } catch (err) {
    return {
      srtPath: "",
      language,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
