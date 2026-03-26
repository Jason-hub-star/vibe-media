import { describe, it, expect } from "vitest";
import { parseSrt, writeSrt } from "../srt-utils";
import type { SrtEntry } from "../srt-utils";

const SAMPLE_SRT = `1
00:00:01,000 --> 00:00:03,500
Hello, welcome to VibeHub.

2
00:00:04,000 --> 00:00:07,200
Today we discuss AI trends.

3
00:00:08,000 --> 00:00:12,000
Let's dive into
the first topic.
`;

describe("parseSrt", () => {
  it("should parse valid SRT content", () => {
    const entries = parseSrt(SAMPLE_SRT);
    expect(entries).toHaveLength(3);
    expect(entries[0]).toEqual({
      index: 1,
      startTime: "00:00:01,000",
      endTime: "00:00:03,500",
      text: "Hello, welcome to VibeHub.",
    });
  });

  it("should handle multiline subtitles", () => {
    const entries = parseSrt(SAMPLE_SRT);
    expect(entries[2].text).toBe("Let's dive into\nthe first topic.");
  });

  it("should return empty array for empty input", () => {
    expect(parseSrt("")).toEqual([]);
    expect(parseSrt("   ")).toEqual([]);
  });

  it("should skip malformed blocks", () => {
    const malformed = `not a number
00:00:01,000 --> 00:00:02,000
text

2
bad timestamp
text`;
    const entries = parseSrt(malformed);
    expect(entries).toHaveLength(0);
  });
});

describe("writeSrt", () => {
  it("should generate valid SRT output", () => {
    const entries: SrtEntry[] = [
      { index: 1, startTime: "00:00:01,000", endTime: "00:00:03,500", text: "Hello" },
      { index: 2, startTime: "00:00:04,000", endTime: "00:00:06,000", text: "World" },
    ];

    const output = writeSrt(entries);
    expect(output).toContain("1\n00:00:01,000 --> 00:00:03,500\nHello");
    expect(output).toContain("2\n00:00:04,000 --> 00:00:06,000\nWorld");
  });

  it("should round-trip parse → write", () => {
    const entries = parseSrt(SAMPLE_SRT);
    const output = writeSrt(entries);
    const reparsed = parseSrt(output);

    expect(reparsed).toHaveLength(entries.length);
    for (let i = 0; i < entries.length; i++) {
      expect(reparsed[i].startTime).toBe(entries[i].startTime);
      expect(reparsed[i].endTime).toBe(entries[i].endTime);
      expect(reparsed[i].text).toBe(entries[i].text);
    }
  });
});
