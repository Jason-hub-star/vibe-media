import { callGemini } from "@vibehub/media-engine";

export interface BriefLanguageInput {
  title: string;
  summary: string;
  body: string[];
}

export interface BriefLanguageOutput {
  title: string;
  summary: string;
  body: string[];
}

const ENGLISH_BRIEF_SCHEMA = {
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

export function containsHangul(text: string) {
  return /[\u3131-\u318E\uAC00-\uD7A3]/.test(text);
}

export function briefContainsHangulContent(input: BriefLanguageInput) {
  return containsHangul(input.title) || containsHangul(input.summary) || input.body.some(containsHangul);
}

export function canTranslateBriefToEnglish() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function buildEnglishNormalizationPrompt(input: BriefLanguageInput) {
  return `You are an editor for an English AI news brief site.

Rewrite the following brief into natural editorial English.

Rules:
1. Output must be fully in English.
2. Preserve all proper nouns, product names, company names, model names, and URLs.
3. Keep the meaning faithful to the source. Do not add facts.
4. Title should read like a clean English headline, not a literal translation.
5. Summary should be 1-2 sentences and read naturally in English.
6. Preserve the body as an array of paragraphs with substantive content. You may merge or split lightly for readability, but keep it concise and faithful.
7. Remove boilerplate such as reporter bylines, copyright notices, "related articles", and site chrome.
8. Return JSON only.

Source title:
${input.title}

Source summary:
${input.summary}

Source body paragraphs:
${input.body.map((paragraph, index) => `[${index}] ${paragraph}`).join("\n\n")}`;
}

export async function normalizeBriefToEnglish(
  input: BriefLanguageInput,
): Promise<BriefLanguageOutput> {
  if (!briefContainsHangulContent(input)) {
    return input;
  }

  const normalized = (await callGemini({
    prompt: buildEnglishNormalizationPrompt(input),
    responseSchema: ENGLISH_BRIEF_SCHEMA,
  })) as Partial<BriefLanguageOutput>;

  if (
    typeof normalized.title !== "string" ||
    typeof normalized.summary !== "string" ||
    !Array.isArray(normalized.body)
  ) {
    throw new Error("English normalization returned an invalid shape");
  }

  const body = normalized.body
    .filter((paragraph): paragraph is string => typeof paragraph === "string")
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (!normalized.title.trim() || !normalized.summary.trim() || body.length === 0) {
    throw new Error("English normalization returned empty title, summary, or body");
  }

  return {
    title: normalized.title.trim(),
    summary: normalized.summary.trim(),
    body,
  };
}
