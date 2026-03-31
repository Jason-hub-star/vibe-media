/**
 * Qwen3-TTS (MimikaStudio) FastAPI Client.
 *
 * MimikaStudio localhost:7693 서버에 음성 클론 요청.
 * POST /api/qwen3/generate → WAV 저장 → ffmpeg 후처리 (loudnorm -16 LUFS).
 */

import fs from "fs/promises";
import path from "path";
import { spawnAsync, measureDuration } from "../spawn-async";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TtsEngine = "chatterbox" | "qwen3";

export interface Qwen3TtsOptions {
  /** 생성할 텍스트 */
  text: string;
  /** 출력 WAV 경로 */
  outputPath: string;
  /** TTS 엔진 (기본: "chatterbox" — qwen3보다 안정적) */
  engine?: TtsEngine;
  /** 음성 프리셋 (기본: "woman-es") */
  voiceName?: string;
  /** 언어 (기본: "English") */
  language?: string;
  /** 모델 사이즈 (기본: "0.6B", qwen3 전용) */
  modelSize?: string;
  /** 서버 URL (기본: "http://localhost:7693") */
  baseUrl?: string;
  /** temperature (기본: chatterbox 0.8, qwen3 0.3) */
  temperature?: number;
  /** top_p (기본: 0.7, qwen3 전용) */
  topP?: number;
}

export interface Qwen3TtsResult {
  /** 최종 WAV 경로 (후처리 완료) */
  outputPath: string;
  /** 오디오 길이 (초) */
  durationSec: number;
  /** 성공 여부 */
  success: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = "http://localhost:7693";
const HEALTH_TIMEOUT_MS = 5_000;
const GENERATE_TIMEOUT_MS = 300_000; // 5분 — 긴 텍스트 TTS 대비

// ---------------------------------------------------------------------------
// Health Check
// ---------------------------------------------------------------------------

/**
 * MimikaStudio 서버 헬스체크.
 * @returns true면 서버 정상 가동
 */
export async function checkMimikaHealth(
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

    const res = await fetch(`${baseUrl}/api/health`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    return res.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// TTS Generate
// ---------------------------------------------------------------------------

/**
 * 텍스트를 문장 단위 청크로 분할.
 * MimikaStudio 0.6B는 긴 텍스트에서 hallucinate하므로 2-3문장 단위로 분할.
 */
function splitIntoChunks(text: string, maxSentencesPerChunk = 2): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  const chunks: string[] = [];
  for (let i = 0; i < sentences.length; i += maxSentencesPerChunk) {
    const chunk = sentences.slice(i, i + maxSentencesPerChunk).join(" ").trim();
    if (chunk) chunks.push(chunk);
  }
  return chunks.length > 0 ? chunks : [text];
}

/**
 * 단일 청크 TTS 요청 → WAV 파일 저장.
 * engine에 따라 /api/chatterbox/generate 또는 /api/qwen3/generate 사용.
 */
async function generateChunkTts(
  text: string,
  outputPath: string,
  baseUrl: string,
  engine: TtsEngine,
  body: Record<string, unknown>,
): Promise<void> {
  const endpoint = engine === "chatterbox"
    ? `${baseUrl}/api/chatterbox/generate`
    : `${baseUrl}/api/qwen3/generate`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, text }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "unknown");
    throw new Error(`MimikaStudio ${engine} error (${res.status}): ${errText}`);
  }

  const resJson = (await res.json()) as { audio_url?: string };
  if (!resJson.audio_url) {
    throw new Error(`MimikaStudio returned no audio_url: ${JSON.stringify(resJson)}`);
  }

  const audioRes = await fetch(`${baseUrl}${resJson.audio_url}`);
  if (!audioRes.ok) {
    throw new Error(`Failed to download audio from ${resJson.audio_url}: ${audioRes.status}`);
  }
  const arrayBuffer = await audioRes.arrayBuffer();
  await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
}

/**
 * MimikaStudio Qwen3-TTS로 음성 생성.
 *
 * 긴 텍스트는 문장 청크로 분할 → 각각 TTS → ffmpeg concat → 후처리.
 * MimikaStudio 0.6B가 긴 텍스트에서 hallucinate하는 문제 방지.
 */
export async function generateTts(
  options: Qwen3TtsOptions,
): Promise<Qwen3TtsResult> {
  const {
    text,
    outputPath,
    engine = "chatterbox",
    voiceName = "woman-es",
    language = "English",
    modelSize = "0.6B",
    baseUrl = DEFAULT_BASE_URL,
    temperature,
    topP = 0.7,
  } = options;

  const dir = path.dirname(outputPath);
  const chunkFiles: string[] = [];

  try {
    // Engine-specific API body
    const apiBody: Record<string, unknown> = engine === "chatterbox"
      ? {
          voice_name: voiceName,
          language: language === "Spanish" ? "es" : "en",
          temperature: temperature ?? 0.8,
          exaggeration: 0.5,
        }
      : {
          mode: "clone",
          voice_name: voiceName,
          language,
          model_size: modelSize,
          temperature: temperature ?? 0.3,
          top_p: topP,
        };

    // 1) Split text into chunks and generate each
    // Chatterbox: 2문장 안정, 3문장부터 hallucinate
    // Qwen3: 1문장이 안전 (크래시 잦음)
    const sentencesPerChunk = engine === "chatterbox" ? 2 : 1;
    const chunks = splitIntoChunks(text, sentencesPerChunk);
    console.log(`    TTS: ${chunks.length} chunks`);

    for (let i = 0; i < chunks.length; i++) {
      const chunkPath = path.join(dir, `tts-chunk-${i}.wav`);
      chunkFiles.push(chunkPath);

      // MimikaStudio 크래시 대응: 헬스체크 후 재시작 시도
      for (let attempt = 0; attempt < 3; attempt++) {
        const alive = await checkMimikaHealth(baseUrl);
        if (!alive) {
          console.log(`    TTS: MimikaStudio down, restarting... (attempt ${attempt + 1})`);
          await spawnAsync("/Users/family/MimikaStudio/bin/mimikactl", ["backend", "start"], {
            timeout: 30_000,
          }).catch(() => {});
          await new Promise((r) => setTimeout(r, 5_000));
          continue;
        }
        break;
      }

      const chunkText = chunks[i]!;
      const expectedWords = chunkText.split(/\s+/).length;
      // ~2.5 words/sec for Spanish TTS → rough expected duration
      const maxChunkDuration = Math.max(15, expectedWords * 1.2);

      console.log(`    TTS chunk ${i + 1}/${chunks.length}: "${chunkText.slice(0, 40)}..."`);

      // Retry with auto-restart on crash + duration validation
      let chunkDone = false;
      for (let attempt = 0; attempt < 3 && !chunkDone; attempt++) {
        try {
          await generateChunkTts(chunkText, chunkPath, baseUrl, engine, apiBody);

          // Validate chunk duration (catch hallucination)
          const chunkDur = await measureDuration(chunkPath);
          if (chunkDur > maxChunkDuration) {
            console.log(`    TTS chunk ${i + 1} hallucinated: ${chunkDur.toFixed(1)}s > ${maxChunkDuration.toFixed(0)}s limit, retrying...`);
            await fs.unlink(chunkPath).catch(() => {});
            continue;
          }

          chunkDone = true;
        } catch (err) {
          console.log(`    TTS chunk ${i + 1} failed (attempt ${attempt + 1}): ${err instanceof Error ? err.message : err}`);
          await spawnAsync("/Users/family/MimikaStudio/bin/mimikactl", ["backend", "start"], {
            timeout: 30_000,
          }).catch(() => {});
          await new Promise((r) => setTimeout(r, 8_000));
        }
      }
      if (!chunkDone) {
        throw new Error(`TTS chunk ${i + 1} failed after 3 attempts`);
      }
      console.log(`    TTS chunk ${i + 1} done`);

      // MimikaStudio 안정화 대기
      if (i < chunks.length - 1) {
        await new Promise((r) => setTimeout(r, 3_000));
      }
    }

    // 2) Concat chunks via ffmpeg
    const rawPath = path.join(dir, `raw-${path.basename(outputPath)}`);
    if (chunkFiles.length === 1) {
      await fs.rename(chunkFiles[0]!, rawPath);
    } else {
      // Concat with short crossfade to smooth seams between chunks
      // Build filter_complex: concat all inputs with acrossfade
      const inputs = chunkFiles.map((f) => ["-i", f]).flat();
      const n = chunkFiles.length;

      if (n === 2) {
        // Simple 2-input crossfade
        await spawnAsync("ffmpeg", [
          ...inputs,
          "-filter_complex", `[0:a][1:a]acrossfade=d=0.05:c1=tri:c2=tri[aout]`,
          "-map", "[aout]",
          "-y", rawPath,
        ], { timeout: 30_000 });
      } else {
        // Multi-input: concat protocol (crossfade with many inputs is complex)
        const listPath = path.join(dir, "tts-concat-list.txt");
        const listContent = chunkFiles.map((f) => `file '${f}'`).join("\n");
        await fs.writeFile(listPath, listContent);

        await spawnAsync("ffmpeg", [
          "-f", "concat", "-safe", "0",
          "-i", listPath,
          "-af", "afade=t=in:d=0.02,aresample=24000",
          "-y", rawPath,
        ], { timeout: 30_000 });

        await fs.unlink(listPath).catch(() => {});
      }
    }

    // 3) ffmpeg post-processing: highpass + lowpass + loudnorm
    await spawnAsync("ffmpeg", [
      "-i", rawPath,
      "-af", "highpass=f=80,lowpass=f=12000,loudnorm=I=-16:TP=-1.5:LRA=11",
      "-ar", "44100",
      "-ac", "1",
      "-y", outputPath,
    ], { timeout: 60_000 });

    // Cleanup
    await fs.unlink(rawPath).catch(() => {});
    for (const f of chunkFiles) await fs.unlink(f).catch(() => {});

    // 4) Measure duration
    const durationSec = await measureDuration(outputPath);

    return { outputPath, durationSec, success: true };
  } catch (err) {
    // Cleanup on failure
    for (const f of chunkFiles) await fs.unlink(f).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});

    return {
      outputPath,
      durationSec: 0,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

