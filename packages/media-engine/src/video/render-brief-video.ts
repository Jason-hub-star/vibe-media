/**
 * Render Brief Video — 통합 오케스트레이션.
 *
 * Brief 텍스트에서 Shorts(9:16) / Longform(16:9) 영상을 자동 생성.
 * 흐름: Gemini 스크립트 → MimikaStudio TTS → Whisper word-level →
 *       Pexels 배경 → Remotion BriefShort V3 → ffmpeg+BGM
 */

import fs from "fs/promises";
import path from "path";
import { checkMimikaHealth, generateTts } from "../tts/qwen3-client";
import { transcribeWordLevel } from "../stt/whisper-word-level";
import { searchPexelsVideosBatch } from "../image/pexels-video-client";
import type { PexelsOrientation } from "../image/pexels-video-client";
import { splitScenes } from "./scene-splitter";
import { composeVideo, pickRandomBgm } from "./ffmpeg-compose";
import { generateVideoScript } from "./script-generator";
import type { VideoFormat } from "./script-generator";
import { runRemotionRender } from "../render-spawn";
import {
  appendBackgroundHistory,
  getRecentExcludedBackgroundIds,
  readBackgroundHistory,
  writeBackgroundHistory,
} from "./background-history";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RenderBriefVideoOptions {
  /** Brief 제목 */
  title: string;
  /** Brief 요약 */
  summary: string;
  /** Brief 본문 (마크다운) */
  body: string;
  /** 출력 디렉토리 (output/<slug>/) */
  outputDir: string;
  /** 영상 포맷 */
  format: VideoFormat;
  /** 로케일 (기본: "en") */
  locale?: string;
  /** BGM 디렉토리 (기본: assets/bgm/) */
  bgmDir?: string;
  /** Remotion entry point (기본: media-engine 패키지 내부) */
  remotionEntry?: string;
  /** dry-run 모드 (렌더링 스킵) */
  dryRun?: boolean;
}

export interface RenderBriefVideoResult {
  /** 최종 MP4 경로 */
  outputPath: string;
  /** 영상 길이 (초) */
  durationSec: number;
  /** 생성된 스크립트 */
  script: string;
  /** 메타데이터 */
  meta: RenderMeta;
  success: boolean;
  error?: string;
}

export interface RenderMeta {
  format: VideoFormat;
  locale: string;
  scriptWords: number;
  sceneCount: number;
  ttsDurationSec: number;
  finalDurationSec: number;
  bgmFile: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCENE_COUNT: Record<VideoFormat, number> = {
  shorts: 4,
  longform: 8,
};

const ORIENTATION: Record<VideoFormat, PexelsOrientation> = {
  shorts: "portrait",
  longform: "landscape",
};

const COMPOSITION_ID: Record<VideoFormat, string> = {
  shorts: "BriefShort",
  longform: "BriefLongform", // 같은 컴포넌트, 1920×1080 해상도
};

function getNumericEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return value;
}

const PEXELS_HISTORY_EXCLUDE_LIMIT = getNumericEnv(
  "PEXELS_BG_EXCLUDE_LIMIT",
  180,
);
const PEXELS_PER_KEYWORD_CANDIDATES = getNumericEnv(
  "PEXELS_BG_PER_KEYWORD_CANDIDATES",
  10,
);
const PEXELS_BG_REUSE_COOLDOWN_DAYS = getNumericEnv(
  "PEXELS_BG_REUSE_COOLDOWN_DAYS",
  21,
);

const PEXELS_FALLBACK_KEYWORDS: Record<VideoFormat, string[]> = {
  shorts: [
    "technology abstract",
    "city night lights",
    "coding screen",
    "data center",
    "smartphone closeup",
    "robotics",
    "digital art",
    "startup office",
  ],
  longform: [
    "futuristic city",
    "technology workspace",
    "ai visualization",
    "business team",
    "cloud server",
    "software developer",
    "innovation lab",
    "digital economy",
    "cyber security",
    "modern office",
  ],
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/**
 * Brief → 영상 자동 생성 파이프라인.
 */
export async function renderBriefVideo(
  options: RenderBriefVideoOptions,
): Promise<RenderBriefVideoResult> {
  const {
    title,
    summary,
    body,
    outputDir,
    format,
    locale = "en",
    bgmDir,
    remotionEntry,
    dryRun = false,
  } = options;

  const prefix = format; // "shorts" or "longform"
  const outputPath = path.join(outputDir, `${prefix}.mp4`);
  const slug = path.basename(outputDir);
  const historyPath = path.resolve(outputDir, "../../state/pexels-video-history.json");

  try {
    // Ensure output dir exists
    await fs.mkdir(outputDir, { recursive: true });

    // Step 1: Health check
    console.log(`[${prefix}] Checking MimikaStudio health...`);
    const healthy = await checkMimikaHealth();
    if (!healthy) {
      throw new Error("MimikaStudio server is not running (localhost:7693)");
    }

    // Step 2: Generate script via Gemini
    console.log(`[${prefix}] Generating script via Gemini...`);
    const scriptResult = await generateVideoScript(
      title,
      summary,
      body,
      format,
      locale,
    );

    const scriptPath = path.join(outputDir, `${prefix}-script.txt`);
    await fs.writeFile(scriptPath, scriptResult.script, "utf-8");
    console.log(`[${prefix}] Script: ${scriptResult.script.split(/\s+/).length} words`);

    if (dryRun) {
      console.log(`[${prefix}] Dry-run mode — skipping TTS/render`);
      return {
        outputPath,
        durationSec: 0,
        script: scriptResult.script,
        meta: buildMeta(format, locale, scriptResult.script, 0, 0, "dry-run"),
        success: true,
      };
    }

    // Step 3: TTS via MimikaStudio
    console.log(`[${prefix}] Generating TTS via MimikaStudio...`);
    const voicePath = path.join(outputDir, `${prefix}-voice.wav`);
    const ttsResult = await generateTts({
      text: scriptResult.script,
      outputPath: voicePath,
      language: locale === "es" ? "Spanish" : "English",
    });

    if (!ttsResult.success) {
      throw new Error(`TTS failed: ${ttsResult.error}`);
    }
    console.log(`[${prefix}] TTS duration: ${ttsResult.durationSec.toFixed(1)}s`);

    // Duration sanity check — MimikaStudio 0.6B can hallucinate on long text
    const maxDuration = format === "shorts" ? 90 : 210;
    const minDuration = format === "shorts" ? 15 : 60;
    if (ttsResult.durationSec > maxDuration) {
      throw new Error(
        `TTS duration ${ttsResult.durationSec.toFixed(0)}s exceeds ${maxDuration}s limit for ${format}. ` +
        `MimikaStudio may have hallucinated. Try again with --force.`,
      );
    }
    if (ttsResult.durationSec < minDuration) {
      throw new Error(
        `TTS duration ${ttsResult.durationSec.toFixed(0)}s is below ${minDuration}s minimum for ${format}. ` +
        `Script may be too short.`,
      );
    }

    // Step 4: Word-level Whisper
    // MimikaStudio TTS 직후 Metal GPU 점유 충돌로 whisper-cli가 exit code 3 크래시.
    // 5초 대기로 MimikaStudio Metal GPU 리소스 자연 해제 후 Whisper 실행.
    await new Promise((r) => setTimeout(r, 5000));
    console.log(`[${prefix}] Transcribing word-level timestamps...`);
    const whisperResult = await transcribeWordLevel(voicePath, outputDir, {
      language: locale === "es" ? "es" : "en",
    });

    if (!whisperResult.success) {
      throw new Error(`Whisper failed: ${whisperResult.error}`);
    }
    console.log(`[${prefix}] Words: ${whisperResult.words.length}`);

    // Step 5: Pexels backgrounds
    console.log(`[${prefix}] Searching Pexels backgrounds...`);
    const orientation = ORIENTATION[format];
    const sceneCount = SCENE_COUNT[format];
    const history = await readBackgroundHistory(historyPath);
    const excludeIds = getRecentExcludedBackgroundIds(
      history,
      orientation,
      PEXELS_HISTORY_EXCLUDE_LIMIT,
      {
        maxAgeDays: PEXELS_BG_REUSE_COOLDOWN_DAYS,
      },
    );
    const rotationSeed = `${slug}:${format}:${new Date().toISOString().slice(0, 10)}`;

    const backgrounds = await searchPexelsVideosBatch(
      scriptResult.keywords,
      orientation,
      undefined,
      {
        excludeIds,
        perKeywordCandidates: PEXELS_PER_KEYWORD_CANDIDATES,
        seed: rotationSeed,
      },
    );

    let selectedBackgrounds = [...backgrounds];
    if (selectedBackgrounds.length < sceneCount) {
      const fallbackExclude = new Set<number>([
        ...excludeIds,
        ...selectedBackgrounds.map((bg) => bg.id),
      ]);

      const fallbackBackgrounds = await searchPexelsVideosBatch(
        PEXELS_FALLBACK_KEYWORDS[format],
        orientation,
        undefined,
        {
          excludeIds: fallbackExclude,
          perKeywordCandidates: PEXELS_PER_KEYWORD_CANDIDATES,
          seed: `${rotationSeed}:fallback`,
        },
      );

      const seen = new Set(selectedBackgrounds.map((bg) => bg.id));
      for (const bg of fallbackBackgrounds) {
        if (seen.has(bg.id)) continue;
        selectedBackgrounds.push(bg);
        seen.add(bg.id);
        if (selectedBackgrounds.length >= sceneCount) break;
      }
    }

    if (selectedBackgrounds.length === 0) {
      throw new Error("No Pexels backgrounds found");
    }

    // 선택된 배경 ID를 이력에 기록해 다음 영상에서 반복 노출을 줄인다.
    try {
      const nextHistory = appendBackgroundHistory(history, {
        orientation,
        slug,
        format,
        ids: selectedBackgrounds.map((bg) => bg.id),
      });
      await writeBackgroundHistory(historyPath, nextHistory);
    } catch (historyErr) {
      console.warn(
        `[${prefix}] background history update failed: ${historyErr instanceof Error ? historyErr.message : String(historyErr)}`,
      );
    }

    // Step 6: Scene split
    const scenes = splitScenes({
      script: scriptResult.script,
      words: whisperResult.words,
      sceneCount,
      backgrounds: selectedBackgrounds,
      chapterTitles: scriptResult.chapterTitles,
    });
    console.log(`[${prefix}] Scenes: ${scenes.length}`);

    // Step 7: Remotion render (visual-only, no audio)
    console.log(`[${prefix}] Rendering via Remotion...`);
    const visualPath = path.join(outputDir, `${prefix}-visual.mp4`);
    const lastScene = scenes[scenes.length - 1];
    const durationInFrames = lastScene ? lastScene.endFrame + 30 : 900; // +30 for CTA

    // Save props for Remotion
    const propsPath = path.join(outputDir, `${prefix}-props.json`);
    const remotionProps = {
      scenes,
      words: whisperResult.words,
      title,
      durationInFrames,
    };
    await fs.writeFile(propsPath, JSON.stringify(remotionProps, null, 2));

    // Remotion cwd: remotionEntry가 절대경로면 그 parent, 아니면 media-engine 패키지
    const entryPoint = remotionEntry ?? "src/remotion/index.tsx";
    const remotionCwd = remotionEntry
      ? path.resolve(path.dirname(remotionEntry), "..", "..")
      : undefined;

    await runRemotionRender({
      compositionId: COMPOSITION_ID[format],
      outputPath: visualPath,
      inputProps: remotionProps,
      entryPoint,
      cwd: remotionCwd,
    });

    // Step 8: ffmpeg compose (visual + voice + BGM)
    console.log(`[${prefix}] Composing final video with BGM...`);
    const resolvedBgmDir = bgmDir ?? path.resolve(outputDir, "../../assets/bgm");
    const bgmPath = await pickRandomBgm(resolvedBgmDir);

    const composeResult = await composeVideo({
      visualPath,
      voicePath,
      bgmPath,
      outputPath,
      voiceDurationSec: ttsResult.durationSec,
    });

    if (!composeResult.success) {
      throw new Error(`ffmpeg compose failed: ${composeResult.error}`);
    }

    // Step 9: Save render meta
    const meta = buildMeta(
      format,
      locale,
      scriptResult.script,
      ttsResult.durationSec,
      composeResult.durationSec,
      path.basename(bgmPath),
    );

    const metaPath = path.join(outputDir, "render-meta.json");
    // Merge with existing meta if present
    let existingMeta: Record<string, unknown> = {};
    try {
      const raw = await fs.readFile(metaPath, "utf-8");
      existingMeta = JSON.parse(raw);
    } catch {
      // No existing meta
    }
    existingMeta[format] = meta;
    await fs.writeFile(metaPath, JSON.stringify(existingMeta, null, 2));

    // Cleanup visual intermediate
    await fs.unlink(visualPath).catch(() => {});

    console.log(`[${prefix}] Done! ${outputPath} (${composeResult.durationSec.toFixed(1)}s)`);

    return {
      outputPath,
      durationSec: composeResult.durationSec,
      script: scriptResult.script,
      meta,
      success: true,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[${prefix}] Failed: ${error}`);
    return {
      outputPath,
      durationSec: 0,
      script: "",
      meta: buildMeta(format, locale, "", 0, 0, ""),
      success: false,
      error,
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildMeta(
  format: VideoFormat,
  locale: string,
  script: string,
  ttsDurationSec: number,
  finalDurationSec: number,
  bgmFile: string,
): RenderMeta {
  return {
    format,
    locale,
    scriptWords: script.split(/\s+/).filter(Boolean).length,
    sceneCount: SCENE_COUNT[format],
    ttsDurationSec,
    finalDurationSec,
    bgmFile,
    timestamp: new Date().toISOString(),
  };
}
