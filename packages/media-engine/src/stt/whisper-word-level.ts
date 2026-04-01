/**
 * Word-level Whisper 전사 — whisper-cpp --output-json-full 모드.
 *
 * whisper-cpp가 생성하는 JSON에서 token-level offsets (ms)를 추출,
 * BriefShort V3의 ShortWord[] 타입에 맞춘다.
 *
 * 기존 whisper-stt.ts는 SRT 전용, 이 모듈은 word-level JSON 전용.
 */

import fs from "fs/promises";
import path from "path";
import { spawnAsync } from "../spawn-async";
import type { ShortWord } from "../remotion/BriefShort";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WhisperWordLevelOptions {
  /** Whisper 모델 (기본: "base") */
  model?: string;
  /** 언어 (기본: "en") */
  language?: string;
  /** 프레임 레이트 (기본: 30) */
  fps?: number;
  /** whisper-cli 바이너리 경로 */
  binaryPath?: string;
  /** 모델 파일 경로 (기본: models/ggml-{model}.bin) */
  modelPath?: string;
}

export interface WhisperWordLevelResult {
  /** ShortWord 배열 */
  words: ShortWord[];
  /** 저장된 JSON 경로 */
  jsonPath: string;
  /** 전체 오디오 길이 (초) */
  durationSec: number;
  success: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// whisper-cpp JSON types (--output-json-full)
// ---------------------------------------------------------------------------

interface WhisperCppToken {
  text: string;
  timestamps: { from: string; to: string };
  offsets: { from: number; to: number }; // ms
  id: number;
  p: number;
}

interface WhisperCppSegment {
  timestamps: { from: string; to: string };
  offsets: { from: number; to: number };
  text: string;
  tokens: WhisperCppToken[];
}

interface WhisperCppJsonFull {
  transcription: WhisperCppSegment[];
}

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

/**
 * ms → frame 변환. fps 기준 Math.round.
 */
export function msToFrame(ms: number, fps: number): number {
  return Math.round((ms / 1000) * fps);
}

/**
 * whisper-cpp token이 실제 단어인지 (특수 토큰 제외).
 */
function isWordToken(token: WhisperCppToken): boolean {
  const t = token.text.trim();
  if (!t) return false;
  // whisper-cpp 특수 토큰: [_BEG_], [_TT_xxx], [_SOT_], [_EOT_], [_PREV_] 등
  if (t.startsWith("[") && t.endsWith("]")) return false;
  return true;
}

/**
 * 문장부호 전용 토큰인지 판별.
 */
function isPunctuationOnly(text: string): boolean {
  return /^[.,!?;:…\-–—'"()[\]{}]+$/.test(text);
}

/**
 * whisper-cpp JSON full → ShortWord[] 변환.
 * 문장부호 토큰은 이전 단어에 병합하여 자막 깜빡임 방지.
 */
export function parseCppTokensToWords(
  data: WhisperCppJsonFull,
  fps: number,
): ShortWord[] {
  const words: ShortWord[] = [];

  for (const seg of data.transcription) {
    if (!seg.tokens || seg.tokens.length === 0) {
      const text = seg.text.trim();
      if (text) {
        words.push({
          text,
          startFrame: msToFrame(seg.offsets.from, fps),
          endFrame: msToFrame(seg.offsets.to, fps),
        });
      }
      continue;
    }

    for (const tok of seg.tokens) {
      if (!isWordToken(tok)) continue;
      const trimmed = tok.text.trim();
      if (!trimmed) continue;

      // 문장부호 → 이전 단어에 병합
      if (isPunctuationOnly(trimmed) && words.length > 0) {
        const prev = words[words.length - 1]!;
        prev.text += trimmed;
        prev.endFrame = Math.max(prev.endFrame, msToFrame(tok.offsets.to, fps));
        continue;
      }

      words.push({
        text: trimmed,
        startFrame: msToFrame(tok.offsets.from, fps),
        endFrame: msToFrame(tok.offsets.to, fps),
      });
    }
  }

  return words;
}

// ---------------------------------------------------------------------------
// WAV conversion (whisper-cpp requires 16kHz mono WAV)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const DEFAULT_BINARY = "/opt/homebrew/Cellar/whisper-cpp/1.8.4/bin/whisper-cli";

/** Walk up from cwd to find models/ggml-{model}.bin */
function findModelPath(model: string): string {
  const filename = `ggml-${model}.bin`;
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(dir, "models", filename);
    try {
      // Synchronous check — only called once at startup
      require("fs").accessSync(candidate);
      return candidate;
    } catch { /* continue */ }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback to cwd-relative
  return path.join(process.cwd(), "models", filename);
}

/**
 * Word-level Whisper 전사 (whisper-cpp).
 *
 * 1. ffmpeg로 16kHz mono WAV 변환
 * 2. whisper-cli --output-json-full 실행
 * 3. JSON 파싱 → ShortWord[] 변환
 * 4. <prefix>-words.json 저장
 */
export async function transcribeWordLevel(
  audioPath: string,
  outputDir: string,
  options?: WhisperWordLevelOptions,
): Promise<WhisperWordLevelResult> {
  const model = options?.model ?? "base";
  const language = options?.language ?? "en";
  const fps = options?.fps ?? 30;
  const binaryPath = options?.binaryPath ?? DEFAULT_BINARY;
  // Try to find model relative to project root (walk up from cwd until we find models/)
  const modelPath = options?.modelPath ?? findModelPath(model);

  const prefix = path.basename(audioPath, path.extname(audioPath));
  const jsonPath = path.join(outputDir, `${prefix}-words.json`);
  const outputBase = path.join(outputDir, `${prefix}-whisper`);

  try {
    // 1) Convert to 16kHz mono WAV
    const wavPath = await convertToWav(audioPath, outputDir);

    // 2) Run whisper-cpp with JSON full output
    // GGML_METAL_DISABLE=1: MimikaStudio TTS 후 Metal GPU 컨텍스트 오염으로
    // whisper-cli가 exit code 3으로 크래시하는 문제 방지 (CPU fallback 사용).
    await spawnAsync(binaryPath, [
      "-m", modelPath,
      "-f", wavPath,
      "-l", language,
      "--output-json-full",
      "-of", outputBase,
    ], {
      timeout: 300_000, // 5분
      env: { ...process.env, GGML_METAL_DISABLE: "1" },
    });

    // 3) Read JSON output
    const jsonOutputPath = `${outputBase}.json`;
    const raw = await fs.readFile(jsonOutputPath, "utf-8");
    const data = JSON.parse(raw) as WhisperCppJsonFull;

    // 4) Parse tokens to words
    const words = parseCppTokensToWords(data, fps);

    // duration = last segment end (ms → sec)
    const lastSeg = data.transcription[data.transcription.length - 1];
    const durationSec = lastSeg ? lastSeg.offsets.to / 1000 : 0;

    // 5) Save words JSON
    await fs.writeFile(jsonPath, JSON.stringify(words, null, 2));

    // Cleanup temp files
    await fs.unlink(wavPath).catch(() => {});
    await fs.unlink(jsonOutputPath).catch(() => {});

    return { words, jsonPath, durationSec, success: true };
  } catch (err) {
    return {
      words: [],
      jsonPath,
      durationSec: 0,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
