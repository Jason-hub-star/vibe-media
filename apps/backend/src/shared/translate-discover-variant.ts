/**
 * Discover item variant translation — title + summary만 번역.
 */

import { callGemini } from "@vibehub/media-engine";
import type { LocaleCode } from "@vibehub/content-contracts";

// ---------------------------------------------------------------------------
// 타입
// ---------------------------------------------------------------------------

export interface DiscoverTranslationInput {
  title: string;
  summary: string;
  locale: LocaleCode;
}

export interface DiscoverTranslationOutput {
  title: string;
  summary: string;
}

// ---------------------------------------------------------------------------
// Gemini 응답 스키마
// ---------------------------------------------------------------------------

const DISCOVER_TRANSLATION_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    summary: { type: "STRING" },
  },
  required: ["title", "summary"],
};

// ---------------------------------------------------------------------------
// 프롬프트
// ---------------------------------------------------------------------------

function buildDiscoverTranslationPrompt(input: DiscoverTranslationInput): string {
  const localeName = input.locale === "es" ? "Spanish" : input.locale;
  return `You are a professional translator. Translate the following AI discovery item from English to ${localeName}.

## Rules
1. Preserve all proper nouns (company names, product names, person names) in their original form.
2. Preserve URLs and technical terms (API, GPU, LLM, SDK, etc.) in English.
3. Use natural, editorial ${localeName} tone.
4. Keep the translation concise — similar length to the original.

## Source Content (English)

### Title
${input.title}

### Summary
${input.summary}

## Output
Return a JSON object with "title" and "summary".`;
}

// ---------------------------------------------------------------------------
// 번역 실행
// ---------------------------------------------------------------------------

export async function translateDiscoverVariant(
  input: DiscoverTranslationInput,
): Promise<DiscoverTranslationOutput> {
  const prompt = buildDiscoverTranslationPrompt(input);

  const result = await callGemini({
    prompt,
    responseSchema: DISCOVER_TRANSLATION_SCHEMA,
  });

  const parsed = result as DiscoverTranslationOutput;

  if (!parsed.title || !parsed.summary) {
    throw new Error("Discover translation result missing title or summary");
  }

  return {
    title: parsed.title,
    summary: parsed.summary,
  };
}
