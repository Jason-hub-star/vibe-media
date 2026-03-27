import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { generateYouTubeUploadGuide } from "../youtube-local";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.map(async (dir) => {
      await fs.rm(dir, { recursive: true, force: true });
    }),
  );
  tempDirs.length = 0;
});

describe("generateYouTubeUploadGuide", () => {
  it("includes the connected-brief URLs and completion commands", async () => {
    const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "youtube-guide-"));
    tempDirs.push(outputDir);

    const guidePath = await generateYouTubeUploadGuide(
      {
        slug: "openai-gpt-5-4-mini-nano-launch",
        title: "OpenAI launches GPT-5.4 mini and nano",
        summary: "Compact models for faster, cheaper inference.",
        language: "en",
        threadsUrl: "https://www.threads.net/@vibehub/post/123",
        briefUrl: "https://vibehub.tech/en/brief/openai-gpt-5-4-mini-nano-launch",
      },
      outputDir,
    );

    const text = await fs.readFile(guidePath, "utf8");

    expect(text).toContain("https://vibehub.tech/en/brief/openai-gpt-5-4-mini-nano-launch");
    expect(text).toContain("https://vibehub.tech/en");
    expect(text).toContain("Telegram: <youtube-url> 만 전송");
    expect(text).toContain("/vh-youtube openai-gpt-5-4-mini-nano-launch <youtube-url>");
    expect(text).toContain("npm run publish:link-youtube -- <video-id-or-url>");
    expect(text).toContain("PINNED COMMENT");
  });
});
