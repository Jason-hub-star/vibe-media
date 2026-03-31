import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildFfmpegArgs, pickRandomBgm } from "../ffmpeg-compose";

// ---------------------------------------------------------------------------
// Mock fs for pickRandomBgm
// ---------------------------------------------------------------------------

vi.mock("fs/promises", () => ({
  default: {
    readdir: vi.fn(),
  },
}));

import fs from "fs/promises";
const mockReaddir = vi.mocked(fs.readdir);

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// buildFfmpegArgs
// ---------------------------------------------------------------------------

describe("buildFfmpegArgs", () => {
  const baseOptions = {
    visualPath: "/tmp/visual.mp4",
    voicePath: "/tmp/voice.wav",
    bgmPath: "/tmp/bgm.mp3",
    outputPath: "/tmp/output.mp4",
  };

  it("should include all three input files", () => {
    const args = buildFfmpegArgs(baseOptions);

    expect(args).toContain("/tmp/visual.mp4");
    expect(args).toContain("/tmp/voice.wav");
    expect(args).toContain("/tmp/bgm.mp3");
  });

  it("should use -c:v copy for video passthrough", () => {
    const args = buildFfmpegArgs(baseOptions);
    const cvIdx = args.indexOf("-c:v");
    expect(args[cvIdx + 1]).toBe("copy");
  });

  it("should use aac codec at 192k for audio", () => {
    const args = buildFfmpegArgs(baseOptions);
    const caIdx = args.indexOf("-c:a");
    expect(args[caIdx + 1]).toBe("aac");

    const brIdx = args.indexOf("-b:a");
    expect(args[brIdx + 1]).toBe("192k");
  });

  it("should include -shortest flag", () => {
    const args = buildFfmpegArgs(baseOptions);
    expect(args).toContain("-shortest");
  });

  it("should include -y for overwrite", () => {
    const args = buildFfmpegArgs(baseOptions);
    const yIdx = args.indexOf("-y");
    expect(args[yIdx + 1]).toBe("/tmp/output.mp4");
  });

  it("should use default bgmVolume=0.25 and fadeOutSec=3", () => {
    const args = buildFfmpegArgs(baseOptions);
    const filterIdx = args.indexOf("-filter_complex");
    const filter = args[filterIdx + 1]!;

    expect(filter).toContain("volume=0.25");
    expect(filter).toContain("afade=t=out:");
    expect(filter).toContain("loudnorm=I=-16:TP=-1.5:LRA=11");
    expect(filter).toContain("amix=inputs=2");
  });

  it("should respect custom bgmVolume and fadeOutSec", () => {
    const args = buildFfmpegArgs({
      ...baseOptions,
      bgmVolume: 0.15,
      fadeOutSec: 5,
    });
    const filterIdx = args.indexOf("-filter_complex");
    const filter = args[filterIdx + 1]!;

    expect(filter).toContain("volume=0.15");
    expect(filter).toContain("d=5");
  });

  it("should calculate fadeOut start from voiceDurationSec", () => {
    const args = buildFfmpegArgs({
      ...baseOptions,
      fadeOutSec: 3,
      voiceDurationSec: 45,
    });
    const filterIdx = args.indexOf("-filter_complex");
    const filter = args[filterIdx + 1]!;

    // fade should start at 45-3=42
    expect(filter).toContain("afade=t=out:st=42:d=3");
  });

  it("should map video from input 0 and audio from filter", () => {
    const args = buildFfmpegArgs(baseOptions);

    // -map 0:v (video from Remotion render)
    const mapVIdx = args.indexOf("-map");
    expect(args[mapVIdx + 1]).toBe("0:v");

    // -map [aout] (mixed audio)
    const mapAIdx = args.indexOf("-map", mapVIdx + 1);
    expect(args[mapAIdx + 1]).toBe("[aout]");
  });
});

// ---------------------------------------------------------------------------
// pickRandomBgm
// ---------------------------------------------------------------------------

describe("pickRandomBgm", () => {
  it("should pick a random MP3 from directory", async () => {
    mockReaddir.mockResolvedValue([
      "01-calm.mp3",
      "02-upbeat.mp3",
      "readme.txt",
    ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);

    const result = await pickRandomBgm("/assets/bgm");

    expect(result).toMatch(/^\/assets\/bgm\/0[12]-.+\.mp3$/);
  });

  it("should throw if no MP3 files found", async () => {
    mockReaddir.mockResolvedValue([
      "readme.txt",
      "config.json",
    ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);

    await expect(pickRandomBgm("/assets/bgm")).rejects.toThrow("No MP3 files found");
  });
});
