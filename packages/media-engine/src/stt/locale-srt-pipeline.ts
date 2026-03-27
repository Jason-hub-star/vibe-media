/**
 * Locale SRT Pipeline — 영어 SRT → locale별 번역 SRT 생성.
 * Whisper STT 결과(en)를 Gemini로 번역하여 다국어 SRT 파일 생성.
 */

import fs from "fs/promises";
import path from "path";
import { parseSrt, writeSrt, translateSrt } from "./srt-utils";
import type { SrtEntry } from "./srt-utils";

// ---------------------------------------------------------------------------
// 타입
// ---------------------------------------------------------------------------

export interface LocaleSrtResult {
  locale: string;
  srtPath: string;
  entryCount: number;
  success: boolean;
  error?: string;
}

export interface LocaleSrtPipelineOptions {
  /** 영어 SRT 소스 경로 */
  sourceSrtPath: string;
  /** 출력 디렉토리 */
  outputDir: string;
  /** 번역 대상 locale 목록 (en 제외) */
  targetLocales: string[];
}

// ---------------------------------------------------------------------------
// Locale 이름 매핑
// ---------------------------------------------------------------------------

const LOCALE_NAMES: Record<string, string> = {
  es: "Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
};

// ---------------------------------------------------------------------------
// 파이프라인 실행
// ---------------------------------------------------------------------------

/**
 * 영어 SRT → 지정 locale로 번역하여 파일 저장.
 * 타임코드는 유지, 텍스트만 번역.
 */
export async function generateLocaleSrts(
  options: LocaleSrtPipelineOptions,
): Promise<LocaleSrtResult[]> {
  const sourceContent = await fs.readFile(options.sourceSrtPath, "utf-8");
  const sourceEntries = parseSrt(sourceContent);

  if (sourceEntries.length === 0) {
    return options.targetLocales.map((locale) => ({
      locale,
      srtPath: "",
      entryCount: 0,
      success: false,
      error: "Source SRT is empty",
    }));
  }

  await fs.mkdir(options.outputDir, { recursive: true });

  // 영어 원본도 복사
  const enPath = path.join(options.outputDir, "subtitles-en.srt");
  await fs.writeFile(enPath, sourceContent, "utf-8");

  const results: LocaleSrtResult[] = [];

  for (const locale of options.targetLocales) {
    if (locale === "en") continue;

    try {
      const langName = LOCALE_NAMES[locale] ?? locale;
      const translated = await translateSrt(sourceEntries, langName);
      const srtPath = path.join(options.outputDir, `subtitles-${locale}.srt`);
      await fs.writeFile(srtPath, writeSrt(translated), "utf-8");

      results.push({
        locale,
        srtPath,
        entryCount: translated.length,
        success: true,
      });
    } catch (err) {
      results.push({
        locale,
        srtPath: "",
        entryCount: 0,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}
