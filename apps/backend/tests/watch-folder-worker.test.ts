import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readWatchFolderState, scanWatchFolderOnce, writeWatchFolderState } from "../src/shared/watch-folder-worker";

const tempDirs: string[] = [];

beforeEach(async () => {
  // 이전 실행이 중단돼 afterEach가 실행되지 않았을 경우에 대비해 상태를 초기화
  await writeWatchFolderState({ files: {} });
});

afterEach(async () => {
  await writeWatchFolderState({ files: {} });
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("watch folder worker", () => {
  it("promotes a stable file after two matching observations", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "vibehub-watch-"));
    tempDirs.push(dir);
    const filePath = path.join(dir, "minecraft-session.mp4");

    await writeFile(filePath, "frame-data");

    const first = await scanWatchFolderOnce({ watchDir: dir });
    const second = await scanWatchFolderOnce({ watchDir: dir });
    const state = await readWatchFolderState();

    expect(first.created).toHaveLength(1);
    expect(second.stabilized).toHaveLength(1);
    expect(state.files[filePath]?.stage).toBe("raw_received");
    expect(state.files[filePath]?.rawSha256).toBeTruthy();
  });
});
