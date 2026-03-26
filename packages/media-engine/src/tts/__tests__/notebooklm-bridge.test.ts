import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateNotebookLMAudio } from "../notebooklm-bridge";

// spawnAsync mock
vi.mock("../../spawn-async", () => ({
  spawnAsync: vi.fn(),
}));

import { spawnAsync } from "../../spawn-async";
const mockSpawnAsync = vi.mocked(spawnAsync);

beforeEach(() => {
  vi.stubEnv("NLM_ENABLED", "true");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("NotebookLM Bridge", () => {
  it("should skip when NLM_ENABLED=false", async () => {
    vi.stubEnv("NLM_ENABLED", "false");

    const result = await generateNotebookLMAudio(
      { text: "test", outputDir: "/tmp" },
      { enabled: false },
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("disabled");
    expect(mockSpawnAsync).not.toHaveBeenCalled();
  });

  it("should call nlm CLI in correct order", async () => {
    const calls: string[][] = [];
    mockSpawnAsync.mockImplementation(async (cmd: string, args: string[]) => {
      calls.push([cmd, ...args]);
      if (cmd === "ffprobe") {
        return { stdout: "120.5", stderr: "", exitCode: 0 };
      }
      return { stdout: "Created notebook: test-notebook-123", stderr: "", exitCode: 0 };
    });

    const result = await generateNotebookLMAudio({
      text: "Hello world brief content",
      outputDir: "/tmp/test-output",
      filePrefix: "brief",
    });

    expect(result.success).toBe(true);
    expect(result.notebookId).toBe("test-notebook-123");
    expect(result.durationSec).toBe(120.5);

    // nlm 명령이 올바른 순서로 호출되었는지 확인
    expect(calls[0]).toContain("notebook");
    expect(calls[1]).toContain("source");
    expect(calls[2]).toContain("audio");
  });

  it("should handle spawn error gracefully", async () => {
    mockSpawnAsync.mockRejectedValue(new Error("nlm exited with code 1: CLI not found"));

    const result = await generateNotebookLMAudio({
      text: "test",
      outputDir: "/tmp",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("exited with code 1");
  });
});
