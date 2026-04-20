import fs from "fs/promises";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  appendBackgroundHistory,
  createEmptyBackgroundHistory,
  getRecentExcludedBackgroundIds,
  readBackgroundHistory,
  writeBackgroundHistory,
} from "../background-history";

describe("background-history", () => {
  it("should return recent excluded ids by orientation", () => {
    let history = createEmptyBackgroundHistory();
    history = appendBackgroundHistory(history, {
      orientation: "portrait",
      slug: "a",
      format: "shorts",
      ids: [100, 101, 102],
      usedAt: "2026-04-01T00:00:00.000Z",
    });
    history = appendBackgroundHistory(history, {
      orientation: "landscape",
      slug: "b",
      format: "longform",
      ids: [200, 201],
      usedAt: "2026-04-01T01:00:00.000Z",
    });
    history = appendBackgroundHistory(history, {
      orientation: "portrait",
      slug: "c",
      format: "shorts",
      ids: [103, 101],
      usedAt: "2026-04-01T02:00:00.000Z",
    });

    const excluded = getRecentExcludedBackgroundIds(history, "portrait", 3);
    // 최신순 3개(중복 제거 set)
    expect(Array.from(excluded)).toEqual([101, 103, 102]);
  });

  it("should exclude only entries within cooldown window", () => {
    let history = createEmptyBackgroundHistory();
    history = appendBackgroundHistory(history, {
      orientation: "portrait",
      slug: "old",
      format: "shorts",
      ids: [9001],
      usedAt: "2026-03-01T00:00:00.000Z",
    });
    history = appendBackgroundHistory(history, {
      orientation: "portrait",
      slug: "new",
      format: "shorts",
      ids: [9002, 9003],
      usedAt: "2026-04-08T00:00:00.000Z",
    });

    const excluded = getRecentExcludedBackgroundIds(history, "portrait", 10, {
      now: new Date("2026-04-09T00:00:00.000Z"),
      maxAgeDays: 14,
    });

    expect(Array.from(excluded)).toEqual([9003, 9002]);
  });

  it("should trim history entries to max capacity", () => {
    let history = createEmptyBackgroundHistory();

    for (let i = 0; i < 900; i++) {
      history = appendBackgroundHistory(history, {
        orientation: "portrait",
        slug: `slug-${i}`,
        format: "shorts",
        ids: [1000 + i],
      });
    }

    expect(history.entries).toHaveLength(800);
    expect(history.entries[0]?.id).toBe(1100);
    expect(history.entries[799]?.id).toBe(1899);
  });

  it("should persist and read history file", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "vibehub-bg-history-"));
    const file = path.join(dir, "pexels-video-history.json");

    const history = appendBackgroundHistory(createEmptyBackgroundHistory(), {
      orientation: "landscape",
      slug: "demo",
      format: "longform",
      ids: [5001, 5002],
      usedAt: "2026-04-09T12:00:00.000Z",
    });

    await writeBackgroundHistory(file, history);
    const loaded = await readBackgroundHistory(file);

    expect(loaded.entries).toHaveLength(2);
    expect(loaded.entries[0]?.id).toBe(5001);
    expect(loaded.entries[1]?.id).toBe(5002);

    await fs.rm(dir, { recursive: true, force: true });
  });
});
