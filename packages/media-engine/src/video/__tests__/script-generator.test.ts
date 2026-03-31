import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateVideoScript } from "../script-generator";

// ---------------------------------------------------------------------------
// Mock Gemini
// ---------------------------------------------------------------------------

vi.mock("../../gemini-client", () => ({
  callGemini: vi.fn(),
}));

import { callGemini } from "../../gemini-client";
const mockCallGemini = vi.mocked(callGemini);

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("generateVideoScript", () => {
  it("should generate shorts script with correct schema", async () => {
    mockCallGemini.mockResolvedValue({
      script: "Did you know AI is changing everything? Here is why...",
      keywords: ["artificial intelligence", "technology", "future", "coding"],
    });

    const result = await generateVideoScript(
      "AI Revolution",
      "AI is transforming industries",
      "Full body text here...",
      "shorts",
    );

    expect(result.script).toContain("AI");
    expect(result.keywords).toHaveLength(4);
    expect(result.chapterTitles).toBeUndefined();

    // Verify Gemini was called with shorts prompt (default=es)
    const call = mockCallGemini.mock.calls[0]![0];
    expect(call.prompt).toContain("120-140 words");
    expect(call.prompt).toContain("3-second hook");
    expect(call.prompt).toContain("VibeHub");
    expect(call.responseSchema).toBeDefined();
  });

  it("should generate longform script with chapters", async () => {
    mockCallGemini.mockResolvedValue({
      script: "Welcome to VibeHub. Today we explore...",
      keywords: ["tech", "ai", "coding", "startup", "cloud", "data", "ml", "robotics"],
      chapterTitles: ["Introduction", "The Problem", "The Solution", "Conclusion"],
    });

    const result = await generateVideoScript(
      "Deep Dive",
      "Exploring tech trends",
      "Long body...",
      "longform",
    );

    expect(result.script).toBeTruthy();
    expect(result.keywords).toHaveLength(8);
    expect(result.chapterTitles).toHaveLength(4);

    const call = mockCallGemini.mock.calls[0]![0];
    expect(call.prompt).toContain("300-350 words");
    expect(call.prompt).toContain("4 chapters");
  });

  it("should pass locale=es as Spanish prompt", async () => {
    mockCallGemini.mockResolvedValue({
      script: "¿Sabías que la IA está cambiando todo?",
      keywords: ["inteligencia artificial", "tecnología"],
    });

    await generateVideoScript(
      "AI en Español",
      "La revolución de IA",
      "Cuerpo del texto...",
      "shorts",
      "es",
    );

    const call = mockCallGemini.mock.calls[0]![0];
    expect(call.prompt).toContain("Spanish (Latin American style)");
  });

  it("should truncate body for shorts (1500 chars)", async () => {
    const longBody = "A".repeat(5000);

    mockCallGemini.mockResolvedValue({
      script: "Short script",
      keywords: ["test"],
    });

    await generateVideoScript("Title", "Summary", longBody, "shorts");

    const call = mockCallGemini.mock.calls[0]![0];
    // Body should be truncated in prompt
    const bodyInPrompt = call.prompt.split("Body (excerpt): ")[1]!;
    expect(bodyInPrompt.length).toBeLessThan(longBody.length);
  });

  it("should propagate Gemini errors", async () => {
    mockCallGemini.mockRejectedValue(new Error("GEMINI_API_KEY not configured"));

    await expect(
      generateVideoScript("Title", "Summary", "Body", "shorts"),
    ).rejects.toThrow("GEMINI_API_KEY not configured");
  });

  it("should throw on empty script from Gemini", async () => {
    mockCallGemini.mockResolvedValue({
      script: "",
      keywords: ["test"],
    });

    await expect(
      generateVideoScript("Title", "Summary", "Body", "shorts"),
    ).rejects.toThrow("Gemini returned empty script");
  });

  it("should throw on empty keywords from Gemini", async () => {
    mockCallGemini.mockResolvedValue({
      script: "Valid script here.",
      keywords: [],
    });

    await expect(
      generateVideoScript("Title", "Summary", "Body", "shorts"),
    ).rejects.toThrow("Gemini returned no keywords");
  });
});
