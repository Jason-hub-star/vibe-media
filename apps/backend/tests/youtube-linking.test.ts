import { describe, expect, it } from "vitest";

import {
  isPublicChannelUrl,
  normalizeYouTubeTitle,
  parseYouTubeInput,
} from "../src/shared/youtube-linking";

describe("youtube linking helpers", () => {
  it("accepts a raw YouTube video id", () => {
    const parsed = parseYouTubeInput("7i2IAAi1Krs");

    expect(parsed.youtubeVideoId).toBe("7i2IAAi1Krs");
    expect(parsed.youtubeUrl).toBe("https://www.youtube.com/watch?v=7i2IAAi1Krs");
  });

  it("accepts watch URLs and short URLs", () => {
    expect(
      parseYouTubeInput("https://www.youtube.com/watch?v=7i2IAAi1Krs").youtubeVideoId,
    ).toBe("7i2IAAi1Krs");
    expect(
      parseYouTubeInput("https://youtu.be/7i2IAAi1Krs").youtubeVideoId,
    ).toBe("7i2IAAi1Krs");
  });

  it("rejects non-youtube URLs", () => {
    expect(() => parseYouTubeInput("https://example.com/watch?v=7i2IAAi1Krs")).toThrow(
      "유효한 YouTube URL",
    );
  });

  it("filters out non-public channel URLs", () => {
    expect(isPublicChannelUrl("youtube", "file:///tmp/youtube-metadata.json")).toBe(false);
    expect(isPublicChannelUrl("youtube", "https://www.youtube.com/watch?v=7i2IAAi1Krs")).toBe(true);
    expect(isPublicChannelUrl("threads", "https://www.threads.net/@vibehub/post/123")).toBe(true);
  });

  it("normalizes YouTube titles for auto matching", () => {
    expect(normalizeYouTubeTitle("  OpenAI   launches GPT-5.4 mini and nano ")).toBe(
      "openai launches gpt-5.4 mini and nano",
    );
  });
});
