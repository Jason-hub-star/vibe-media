import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkMimikaHealth, generateTts } from "../qwen3-client";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../../spawn-async", async (importOriginal) => {
  return {
    spawnAsync: vi.fn(),
    measureDuration: vi.fn(),
  };
});

import { spawnAsync, measureDuration } from "../../spawn-async";
const mockSpawnAsync = vi.mocked(spawnAsync);
const mockMeasureDuration = vi.mocked(measureDuration);

// Mock fs
import fs from "fs/promises";
vi.mock("fs/promises", () => ({
  default: {
    writeFile: vi.fn(),
    unlink: vi.fn(),
  },
}));
const mockWriteFile = vi.mocked(fs.writeFile);
const mockUnlink = vi.mocked(fs.unlink);

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
  // Re-setup mocks after clearAllMocks
  mockWriteFile.mockResolvedValue(undefined);
  mockUnlink.mockResolvedValue(undefined);
  mockMeasureDuration.mockResolvedValue(42.5);
  mockSpawnAsync.mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 });
});

// ---------------------------------------------------------------------------
// checkMimikaHealth
// ---------------------------------------------------------------------------

describe("checkMimikaHealth", () => {
  it("should return true when server responds ok", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const result = await checkMimikaHealth();
    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:7693/api/health",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("should return false when server responds with error", async () => {
    mockFetch.mockResolvedValue({ ok: false });
    const result = await checkMimikaHealth();
    expect(result).toBe(false);
  });

  it("should return false when fetch throws (server down)", async () => {
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));
    const result = await checkMimikaHealth();
    expect(result).toBe(false);
  });

  it("should use custom baseUrl", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    await checkMimikaHealth("http://192.168.1.100:8080");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://192.168.1.100:8080/api/health",
      expect.any(Object),
    );
  });
});

// ---------------------------------------------------------------------------
// generateTts
// ---------------------------------------------------------------------------

describe("generateTts", () => {
  /** Helper: mock successful MimikaStudio generate + download */
  function mockSuccessfulTts() {
    // First call: POST /api/qwen3/generate → JSON with audio_url
    // Second call: GET audio_url → WAV bytes
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ audio_url: "/audio/test.wav", filename: "test.wav" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(1024),
      });
  }

  it("should send correct request body to MimikaStudio", async () => {
    mockSuccessfulTts();

    await generateTts({
      text: "Hello world from VibeHub",
      outputPath: "/tmp/test/voice.wav",
      voiceName: "woman-es",
      language: "Spanish",
      modelSize: "0.6B",
    });

    // Verify API call body (first fetch call)
    const fetchCall = mockFetch.mock.calls[0]!;
    const body = JSON.parse(fetchCall[1].body);
    expect(body).toEqual({
      text: "Hello world from VibeHub",
      mode: "clone",
      voice_name: "woman-es",
      language: "Spanish",
      model_size: "0.6B",
      temperature: 0.3,
      top_p: 0.7,
    });
  });

  it("should return duration from measureDuration", async () => {
    mockSuccessfulTts();
    mockMeasureDuration.mockResolvedValue(65.3);

    const result = await generateTts({
      text: "Test",
      outputPath: "/tmp/out.wav",
    });

    expect(result.success).toBe(true);
    expect(result.durationSec).toBe(65.3);
    expect(mockMeasureDuration).toHaveBeenCalledWith("/tmp/out.wav");
  });

  it("should apply ffmpeg highpass+lowpass+loudnorm", async () => {
    mockSuccessfulTts();

    await generateTts({
      text: "Test audio processing",
      outputPath: "/tmp/voice.wav",
    });

    // spawnAsync call should be ffmpeg with correct filter
    const ffmpegCall = mockSpawnAsync.mock.calls[0]!;
    expect(ffmpegCall[0]).toBe("ffmpeg");
    const afArg = ffmpegCall[1].find((a: string) =>
      a.includes("highpass") && a.includes("lowpass") && a.includes("loudnorm"),
    );
    expect(afArg).toBeTruthy();
  });

  it("should return error on API failure", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error",
    });

    const result = await generateTts({
      text: "Fail test",
      outputPath: "/tmp/fail.wav",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("MimikaStudio API error (500)");
  });

  it("should return error when no audio_url in response", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ error: "model not loaded" }),
    });

    const result = await generateTts({
      text: "No audio",
      outputPath: "/tmp/no-audio.wav",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("no audio_url");
  });

  it("should return error on fetch exception", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const result = await generateTts({
      text: "Network fail",
      outputPath: "/tmp/net-fail.wav",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Network error");
  });
});
