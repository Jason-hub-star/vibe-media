/**
 * NotebookLM CLI Bridge — nlm CLI spawn 래퍼 + ffmpeg loudnorm.
 *
 * 흐름: nlm notebook create → source add --text → audio create → download audio → ffmpeg loudnorm
 * 환경변수: NLM_CLI_PATH (선택, pyenv 대응), NLM_ENABLED (false면 skip)
 */

import path from "path";
import { spawnAsync } from "../spawn-async";
import type { NotebookLMOptions, NotebookLMRequest, NotebookLMResult } from "./tts-types";

const DEFAULT_TARGET_LUFS = -16;

/** nlm CLI stdout에서 notebook ID 추출 */
function parseNotebookId(output: string): string {
  const match = output.match(/(?:notebook|id)[:\s]+([a-zA-Z0-9_-]+)/i);
  if (match) return match[1];
  const lines = output.trim().split("\n");
  return lines[lines.length - 1].trim();
}

/** ffmpeg loudnorm으로 오디오 정규화 */
async function applyLoudnorm(
  inputPath: string,
  outputPath: string,
  targetLufs: number,
): Promise<void> {
  // Pass 1: 현재 오디오 레벨 분석 (stderr에 JSON 출력, 여기서는 skip)
  await spawnAsync("ffmpeg", [
    "-i", inputPath,
    "-af", `loudnorm=I=${targetLufs}:TP=-1.5:LRA=11:print_format=json`,
    "-f", "null",
    "-y", "/dev/null",
  ]);

  // Pass 2: 정규화 적용
  await spawnAsync("ffmpeg", [
    "-i", inputPath,
    "-af", `loudnorm=I=${targetLufs}:TP=-1.5:LRA=11`,
    "-ar", "44100",
    "-y", outputPath,
  ]);
}

/** ffprobe로 오디오 길이 추출 (초) */
async function getAudioDuration(filePath: string): Promise<number> {
  const { stdout } = await spawnAsync("ffprobe", [
    "-v", "quiet",
    "-show_entries", "format=duration",
    "-of", "csv=p=0",
    filePath,
  ]);
  const sec = parseFloat(stdout);
  if (isNaN(sec)) throw new Error(`Cannot parse duration from: ${stdout}`);
  return sec;
}

/**
 * NotebookLM을 통한 오디오 생성.
 * nlm CLI가 설치되어 있어야 하며, NLM_ENABLED=false면 skip.
 */
export async function generateNotebookLMAudio(
  request: NotebookLMRequest,
  options?: NotebookLMOptions,
): Promise<NotebookLMResult> {
  const enabled = options?.enabled ?? process.env.NLM_ENABLED !== "false";
  if (!enabled) {
    return {
      rawAudioPath: "",
      normalizedAudioPath: "",
      durationSec: 0,
      notebookId: "",
      success: false,
      error: "NotebookLM disabled (NLM_ENABLED=false)",
    };
  }

  const cliPath = options?.cliPath ?? process.env.NLM_CLI_PATH ?? "nlm";
  const shouldLoudnorm = options?.loudnorm ?? true;
  const targetLufs = options?.targetLufs ?? DEFAULT_TARGET_LUFS;
  const prefix = request.filePrefix ?? "audio";

  try {
    // Step 1: notebook create
    const { stdout: createOutput } = await spawnAsync(cliPath, ["notebook", "create"], {
      timeout: 30_000,
    });
    const notebookId = parseNotebookId(createOutput);

    // Step 2: source add --text
    await spawnAsync(cliPath, [
      "source", "add",
      "--notebook", notebookId,
      "--text", request.text,
    ], { timeout: 60_000 });

    // Step 3: audio create (10분 — 생성 시간 긺)
    await spawnAsync(cliPath, [
      "audio", "create",
      "--notebook", notebookId,
    ], { timeout: 600_000 });

    // Step 4: download audio
    const rawAudioPath = path.join(request.outputDir, `${prefix}.m4a`);
    await spawnAsync(cliPath, [
      "audio", "download",
      "--notebook", notebookId,
      "--output", rawAudioPath,
    ], { timeout: 120_000 });

    // Step 5: ffmpeg loudnorm (선택)
    let normalizedAudioPath = rawAudioPath;
    if (shouldLoudnorm) {
      normalizedAudioPath = path.join(request.outputDir, `${prefix}-normalized.m4a`);
      await applyLoudnorm(rawAudioPath, normalizedAudioPath, targetLufs);
    }

    // 길이 측정
    const durationSec = await getAudioDuration(normalizedAudioPath);

    return {
      rawAudioPath,
      normalizedAudioPath,
      durationSec,
      notebookId,
      success: true,
    };
  } catch (err) {
    return {
      rawAudioPath: "",
      normalizedAudioPath: "",
      durationSec: 0,
      notebookId: "",
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
