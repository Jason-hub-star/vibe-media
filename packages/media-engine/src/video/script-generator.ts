/**
 * Video Script Generator — Gemini로 Brief 텍스트 → 영상 스크립트 생성.
 *
 * Shorts: 120-140 words, 3초 훅, CTA "Follow VibeHub..."
 * Longform: 300-350 words, 4 chapters
 */

import { callGemini } from "../gemini-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VideoFormat = "shorts" | "longform";

export interface VideoScriptResult {
  /** 나레이션 스크립트 전문 */
  script: string;
  /** 배경 검색용 키워드 (영어) */
  keywords: string[];
  /** 롱폼 챕터 제목 (선택) */
  chapterTitles?: string[];
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

function buildShortsPrompt(
  title: string,
  summary: string,
  body: string,
  locale?: string,
): string {
  const isEs = locale === "es" || !locale || locale === "auto";
  const lang = isEs ? "Spanish (Latin American style)" : "English";
  const cta = isEs
    ? "Síguenos en VibeHub para tu resumen diario de tecnología."
    : "Follow VibeHub for your daily tech briefing.";
  return `You are a short-form video scriptwriter focused on factual impact.
Write a narration script for a 30-45 second vertical video (9:16).

Rules:
- 80-100 words total (STRICT — Chatterbox TTS reads slowly, more words = over 60 seconds)
- First sentence: the single most surprising or specific fact from the source material — a real number, a concrete incident, or a counterintuitive result. Start mid-story, not with context.
- BANNED openers: "¡Imagínate!", "¡Atención!", "¿Te imaginas si…?", "Estamos viviendo", "[Topic] está cambiando todo", "[Company] lo hizo de nuevo", "La inteligencia artificial está revolucionando"
- Tone: sharp and factual. No hype words: "increíble", "alucinante", "revolucionario", "sin precedentes", "monumental"
- Final sentence before CTA: one concrete implication, open risk, or thing to watch — NOT an inspirational summary
- End with CTA: "${cta}"
- No markdown, no stage directions, no timestamps
- Language: ${lang}

Source material:
Title: ${title}
Summary: ${summary}
Body (excerpt): ${body.slice(0, 1500)}

Also provide 4 English keywords for background video search (e.g., "artificial intelligence", "coding", "futuristic city").

Return JSON only.`;
}

function buildLongformPrompt(
  title: string,
  summary: string,
  body: string,
  locale?: string,
): string {
  const isEs = locale === "es" || !locale || locale === "auto";
  const lang = isEs ? "Spanish (Latin American style)" : "English";
  const cta = isEs
    ? "Suscríbete a VibeHub para recibir información diaria sobre tecnología."
    : "Subscribe to VibeHub for daily tech insights.";
  return `You are a video narrator scriptwriter focused on factual, impactful storytelling.
Write a narration script for a 2-3 minute landscape video (16:9).

Rules:
- 300-350 words total
- First sentence: the most counterintuitive, specific, or surprising element from the source — a real incident, a concrete number, or a case study. Do NOT open with background or context.
- BANNED openers: "Estamos viviendo una transformación", "Durante décadas", "La inteligencia artificial está", generic philosophical statements, questions like "¿Qué pasaría si…?"
- Structure: (1) open with the hook fact → (2) build context (why it happened / what makes it significant) → (3) competitive or broader implications → (4) sharp conclusion
- Final paragraph before CTA: a concrete "watch for this" — a risk, an open question, or a metric to track. NOT an inspirational restatement of what was just said.
- End with: "${cta}"
- No chapter headings or section titles embedded in the script
- No markdown, no stage directions, no timestamps
- Tone: direct and factual. No hype words: "increíble", "revolucionario", "sin precedentes", "monumental", "innegable", "asombroso"
- Language: ${lang}

Source material:
Title: ${title}
Summary: ${summary}
Body: ${body.slice(0, 3000)}

Also provide 8 English keywords for background video search.

Return JSON only.`;
}

// ---------------------------------------------------------------------------
// Gemini Response Schema
// ---------------------------------------------------------------------------

const SHORTS_SCHEMA = {
  type: "object",
  properties: {
    script: { type: "string" },
    keywords: { type: "array", items: { type: "string" } },
  },
  required: ["script", "keywords"],
} as const;

const LONGFORM_SCHEMA = {
  type: "object",
  properties: {
    script: { type: "string" },
    keywords: { type: "array", items: { type: "string" } },
    chapterTitles: { type: "array", items: { type: "string" } },
  },
  required: ["script", "keywords", "chapterTitles"],
} as const;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/**
 * Brief 텍스트로 영상 스크립트 생성.
 */
export async function generateVideoScript(
  title: string,
  summary: string,
  body: string,
  format: VideoFormat,
  locale?: string,
): Promise<VideoScriptResult> {
  const prompt =
    format === "shorts"
      ? buildShortsPrompt(title, summary, body, locale)
      : buildLongformPrompt(title, summary, body, locale);

  const schema =
    format === "shorts" ? SHORTS_SCHEMA : LONGFORM_SCHEMA;

  const result = (await callGemini({
    prompt,
    responseSchema: schema as unknown as Record<string, unknown>,
  })) as VideoScriptResult;

  if (!result.script || result.script.trim().length === 0) {
    throw new Error("Gemini returned empty script");
  }
  if (!Array.isArray(result.keywords) || result.keywords.length === 0) {
    throw new Error("Gemini returned no keywords for background search");
  }

  return {
    script: result.script,
    keywords: result.keywords,
    chapterTitles: result.chapterTitles,
  };
}
