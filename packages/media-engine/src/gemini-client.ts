/** Domain-agnostic Gemini API wrapper with JSON Schema enforcement and retry. */

import { GoogleGenAI } from "@google/genai";

const DEFAULT_MODEL = "gemini-2.5-flash";

export interface GeminiCallOptions {
  prompt: string;
  responseSchema?: Record<string, unknown>;
  apiKey?: string;
  model?: string;
}

export async function callGemini(options: GeminiCallOptions): Promise<unknown> {
  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const ai = new GoogleGenAI({ apiKey });
  const response = await callWithRetry(async () => {
    return ai.models.generateContent({
      model: options.model ?? DEFAULT_MODEL,
      contents: options.prompt,
      config: options.responseSchema ? { responseMimeType: "application/json", responseSchema: options.responseSchema } : undefined,
    });
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from Gemini");
  return options.responseSchema ? JSON.parse(text) : text;
}

async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 1): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try { return await fn(); }
    catch (err: unknown) {
      if ((err as { status?: number }).status === 429 && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Unreachable");
}
