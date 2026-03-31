import { describe, it, expect } from "vitest";
import {
  msToFrame,
  parseCppTokensToWords,
} from "../whisper-word-level";

// ---------------------------------------------------------------------------
// msToFrame
// ---------------------------------------------------------------------------

describe("msToFrame", () => {
  it("should convert milliseconds to frames at 30fps", () => {
    expect(msToFrame(0, 30)).toBe(0);
    expect(msToFrame(1000, 30)).toBe(30);
    expect(msToFrame(500, 30)).toBe(15);
    expect(msToFrame(2500, 30)).toBe(75);
  });

  it("should round to nearest frame", () => {
    // 33.33ms * 30/1000 = 1.0
    expect(msToFrame(33, 30)).toBe(1);
    // 100ms * 30/1000 = 3.0
    expect(msToFrame(100, 30)).toBe(3);
    // 150ms * 30/1000 = 4.5 → rounds to 5
    expect(msToFrame(150, 30)).toBe(5);
  });

  it("should work with 24fps", () => {
    expect(msToFrame(1000, 24)).toBe(24);
    expect(msToFrame(500, 24)).toBe(12);
  });
});

// ---------------------------------------------------------------------------
// parseCppTokensToWords
// ---------------------------------------------------------------------------

describe("parseCppTokensToWords", () => {
  it("should parse word tokens and skip special tokens", () => {
    const data = {
      transcription: [
        {
          timestamps: { from: "00:00:00,000", to: "00:00:02,000" },
          offsets: { from: 0, to: 2000 },
          text: " Hello world",
          tokens: [
            { text: "[_BEG_]", timestamps: { from: "00:00:00,000", to: "00:00:00,000" }, offsets: { from: 0, to: 0 }, id: 50364, p: 0.8, t_dtw: -1 },
            { text: " Hello", timestamps: { from: "00:00:00,320", to: "00:00:00,800" }, offsets: { from: 320, to: 800 }, id: 100, p: 0.9, t_dtw: -1 },
            { text: " world", timestamps: { from: "00:00:00,900", to: "00:00:01,800" }, offsets: { from: 900, to: 1800 }, id: 200, p: 0.95, t_dtw: -1 },
          ],
        },
      ],
    };

    const words = parseCppTokensToWords(data, 30);

    expect(words).toHaveLength(2);
    expect(words[0]).toEqual({
      text: "Hello",
      startFrame: 10, // 320ms → 9.6 → 10
      endFrame: 24,   // 800ms → 24
    });
    expect(words[1]).toEqual({
      text: "world",
      startFrame: 27, // 900ms → 27
      endFrame: 54,   // 1800ms → 54
    });
  });

  it("should handle segments without tokens", () => {
    const data = {
      transcription: [
        {
          timestamps: { from: "00:00:01,000", to: "00:00:03,000" },
          offsets: { from: 1000, to: 3000 },
          text: " No tokens here",
          tokens: [],
        },
      ],
    };

    const words = parseCppTokensToWords(data, 30);

    expect(words).toHaveLength(1);
    expect(words[0]).toEqual({
      text: "No tokens here",
      startFrame: 30,
      endFrame: 90,
    });
  });

  it("should skip empty text tokens", () => {
    const data = {
      transcription: [
        {
          timestamps: { from: "00:00:00,000", to: "00:00:02,000" },
          offsets: { from: 0, to: 2000 },
          text: "A B",
          tokens: [
            { text: " A", timestamps: { from: "00:00:00,000", to: "00:00:00,500" }, offsets: { from: 0, to: 500 }, id: 1, p: 0.9, t_dtw: -1 },
            { text: "  ", timestamps: { from: "00:00:00,600", to: "00:00:00,700" }, offsets: { from: 600, to: 700 }, id: 2, p: 0.5, t_dtw: -1 },
            { text: " B", timestamps: { from: "00:00:00,800", to: "00:00:01,500" }, offsets: { from: 800, to: 1500 }, id: 3, p: 0.9, t_dtw: -1 },
          ],
        },
      ],
    };

    const words = parseCppTokensToWords(data, 30);
    expect(words).toHaveLength(2);
    expect(words[0]!.text).toBe("A");
    expect(words[1]!.text).toBe("B");
  });

  it("should handle multiple segments", () => {
    const data = {
      transcription: [
        {
          timestamps: { from: "00:00:00,000", to: "00:00:01,000" },
          offsets: { from: 0, to: 1000 },
          text: " First",
          tokens: [
            { text: " First", timestamps: { from: "00:00:00,000", to: "00:00:00,800" }, offsets: { from: 0, to: 800 }, id: 1, p: 0.9, t_dtw: -1 },
          ],
        },
        {
          timestamps: { from: "00:00:01,500", to: "00:00:02,500" },
          offsets: { from: 1500, to: 2500 },
          text: " Second",
          tokens: [
            { text: " Second", timestamps: { from: "00:00:01,500", to: "00:00:02,300" }, offsets: { from: 1500, to: 2300 }, id: 2, p: 0.9, t_dtw: -1 },
          ],
        },
      ],
    };

    const words = parseCppTokensToWords(data, 30);
    expect(words).toHaveLength(2);
    expect(words[0]!.text).toBe("First");
    expect(words[1]!.text).toBe("Second");
    expect(words[1]!.startFrame).toBe(45); // 1500ms → 45
  });

  it("should return empty array for empty transcription", () => {
    const data = { transcription: [] };
    const words = parseCppTokensToWords(data, 30);
    expect(words).toHaveLength(0);
  });

  it("should filter all whisper special tokens", () => {
    const data = {
      transcription: [
        {
          timestamps: { from: "00:00:00,000", to: "00:00:01,000" },
          offsets: { from: 0, to: 1000 },
          text: " Test",
          tokens: [
            { text: "[_BEG_]", timestamps: { from: "00:00:00,000", to: "00:00:00,000" }, offsets: { from: 0, to: 0 }, id: 50364, p: 0.8, t_dtw: -1 },
            { text: "[_SOT_]", timestamps: { from: "00:00:00,000", to: "00:00:00,000" }, offsets: { from: 0, to: 0 }, id: 50365, p: 0.8, t_dtw: -1 },
            { text: " Test", timestamps: { from: "00:00:00,100", to: "00:00:00,800" }, offsets: { from: 100, to: 800 }, id: 100, p: 0.9, t_dtw: -1 },
            { text: "[_EOT_]", timestamps: { from: "00:00:00,800", to: "00:00:01,000" }, offsets: { from: 800, to: 1000 }, id: 50366, p: 0.8, t_dtw: -1 },
          ],
        },
      ],
    };

    const words = parseCppTokensToWords(data, 30);
    expect(words).toHaveLength(1);
    expect(words[0]!.text).toBe("Test");
  });
});
