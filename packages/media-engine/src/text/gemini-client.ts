/** Domain-agnostic Gemini API wrapper with JSON Schema enforcement and retry. */

import { GoogleGenAI } from "@google/genai";

const DEFAULT_MODEL = "gemini-2.5-flash";

export interface GeminiCallOptions {
  prompt: string;
  responseSchema?: Record<string, unknown>;
  apiKey?: string;
  model?: string;
}

/**
 * Call Gemini with a prompt and optional JSON Schema enforcement.
 * Retries once on 429 rate limit.
 * Returns the raw parsed JSON (or text if no schema).
 */
export async function callGemini(options: GeminiCallOptions): Promise<unknown> {
  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = options.model ?? DEFAULT_MODEL;

  const response = await callWithRetry(async () => {
    return ai.models.generateContent({
      model,
      contents: options.prompt,
      config: options.responseSchema
        ? {
            responseMimeType: "application/json",
            responseSchema: options.responseSchema,
          }
        : undefined,
    });
  });

  const text = response.text;
  if (!text) {
    throw new Error("Empty response from Gemini");
  }

  if (options.responseSchema) {
    return JSON.parse(text);
  }

  return text;
}

async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 1,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 429 && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Unreachable");
}
