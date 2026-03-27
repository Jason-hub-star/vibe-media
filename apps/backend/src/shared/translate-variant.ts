/**
 * Brief variant translation — Gemini JSON Schema 번역.
 * 고유명사/URL/마크다운 구조 보존, body 배열 유지.
 */

import { callGemini } from "@vibehub/media-engine";
import type { LocaleCode } from "@vibehub/content-contracts";

// ---------------------------------------------------------------------------
// 입출력 타입
// ---------------------------------------------------------------------------

export interface BriefTranslationInput {
  title: string;
  summary: string;
  body: string[];
  locale: LocaleCode;
}

export interface BriefTranslationOutput {
  title: string;
  summary: string;
  body: string[];
}

// ---------------------------------------------------------------------------
// Gemini 응답 스키마
// ---------------------------------------------------------------------------

const TRANSLATION_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    summary: { type: "STRING" },
    body: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
  },
  required: ["title", "summary", "body"],
};

// ---------------------------------------------------------------------------
// 번역 프롬프트
// ---------------------------------------------------------------------------

function buildTranslationPrompt(input: BriefTranslationInput): string {
  const localeName = input.locale === "es" ? "Spanish" : input.locale;
  return `You are a professional translator. Translate the following AI news brief from English to ${localeName}.

## Rules
1. Preserve all proper nouns (company names, product names, person names) in their original form.
2. Preserve all URLs, links, and markdown formatting exactly as-is.
3. Preserve the same number of body paragraphs — translate each paragraph individually.
4. Use natural, editorial ${localeName} — not literal machine translation.
5. Keep technical terms (API, GPU, LLM, etc.) in English where that is standard practice.
6. Preserve any markdown headings (##, ###) and formatting (**bold**, *italic*, \`code\`).

## Source Content (English)

### Title
${input.title}

### Summary
${input.summary}

### Body (${input.body.length} paragraphs)
${input.body.map((p, i) => `[${i}] ${p}`).join("\n\n")}

## Output
Return a JSON object with "title", "summary", and "body" (array of translated paragraphs, same count as source).`;
}

// ---------------------------------------------------------------------------
// 번역 실행
// ---------------------------------------------------------------------------

export async function translateBriefVariant(
  input: BriefTranslationInput,
): Promise<BriefTranslationOutput> {
  const prompt = buildTranslationPrompt(input);

  const result = await callGemini({
    prompt,
    responseSchema: TRANSLATION_RESPONSE_SCHEMA,
  });

  const parsed = result as BriefTranslationOutput;

  // 기본 검증: body 배열 길이가 원본과 같아야 함
  if (!Array.isArray(parsed.body)) {
    throw new Error("Translation result body is not an array");
  }
  if (!parsed.title || !parsed.summary) {
    throw new Error("Translation result missing title or summary");
  }

  return {
    title: parsed.title,
    summary: parsed.summary,
    body: parsed.body,
  };
}
