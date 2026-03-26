/**
 * SRT 유틸 — 파싱, 생성, 번역 (Gemini JSON schema 모드).
 */

import { callGemini } from "../gemini-client";

// ---------------------------------------------------------------------------
// SRT 데이터 구조
// ---------------------------------------------------------------------------

export interface SrtEntry {
  index: number;
  startTime: string; // "00:00:01,000"
  endTime: string;   // "00:00:03,500"
  text: string;
}

// ---------------------------------------------------------------------------
// 파싱
// ---------------------------------------------------------------------------

/** SRT 텍스트 → SrtEntry 배열 */
export function parseSrt(srtContent: string): SrtEntry[] {
  const blocks = srtContent.trim().split(/\n\s*\n/);
  const entries: SrtEntry[] = [];

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 3) continue;

    const index = parseInt(lines[0], 10);
    if (isNaN(index)) continue;

    const timeParts = lines[1].split(" --> ");
    if (timeParts.length !== 2) continue;

    const text = lines.slice(2).join("\n").trim();
    if (!text) continue;

    entries.push({
      index,
      startTime: timeParts[0].trim(),
      endTime: timeParts[1].trim(),
      text,
    });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// 생성
// ---------------------------------------------------------------------------

/** SrtEntry 배열 → SRT 텍스트 */
export function writeSrt(entries: SrtEntry[]): string {
  return entries
    .map(
      (e, i) =>
        `${i + 1}\n${e.startTime} --> ${e.endTime}\n${e.text}`,
    )
    .join("\n\n") + "\n";
}

// ---------------------------------------------------------------------------
// 번역
// ---------------------------------------------------------------------------

const TRANSLATE_SCHEMA = {
  type: "OBJECT",
  properties: {
    translations: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          index: { type: "INTEGER" },
          text: { type: "STRING" },
        },
        required: ["index", "text"],
      },
    },
  },
  required: ["translations"],
};

/**
 * SRT 엔트리를 Gemini로 번역.
 * 타임코드는 유지하고 텍스트만 번역.
 */
export async function translateSrt(
  entries: SrtEntry[],
  targetLang: string,
): Promise<SrtEntry[]> {
  if (entries.length === 0) return [];

  const textsForTranslation = entries.map((e) => ({
    index: e.index,
    text: e.text,
  }));

  const prompt = `Translate the following subtitle texts to ${targetLang}. Preserve the index numbers exactly. Return ONLY the translations in the required JSON format.

Subtitles:
${JSON.stringify(textsForTranslation, null, 2)}`;

  const result = (await callGemini({
    prompt,
    responseSchema: TRANSLATE_SCHEMA,
  })) as { translations: Array<{ index: number; text: string }> };

  // 번역 결과를 원본 타임코드와 매핑
  const translationMap = new Map(
    result.translations.map((t) => [t.index, t.text]),
  );

  return entries.map((e) => ({
    ...e,
    text: translationMap.get(e.index) ?? e.text,
  }));
}
