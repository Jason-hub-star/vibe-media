import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { existsSync, unwatchFile, watchFile } from "node:fs";
import { mkdir, readdir, readFile, stat, watch, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getSupabaseDbUrl } from "./supabase-postgres";
import { recordVideoJobAttempt, upsertSupabaseVideoJob } from "./supabase-video-jobs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const stateDir = path.resolve(__dirname, "../../state");
const watchFolderStatePath = path.join(stateDir, "watch-folder-state.json");

export type WatchFolderStage =
  | "detected"
  | "stabilizing"
  | "queued"
  | "raw_received"
  | "analysis_running"
  | "auto_cut_done"
  | "highlight_candidates_ready"
  | "capcut_pending"
  | "capcut_done"
  | "parent_review"
  | "upload_ready"
  | "uploaded_private"
  | "published"
  | "blocked";

export interface WatchFolderFileState {
  fileName: string;
  filePath: string;
  size: number;
  mtimeMs: number;
  observedStableCount: number;
  stage: WatchFolderStage;
  firstSeenAt: string;
  lastSeenAt: string;
  videoJobId: string | null;
  rawSha256: string | null;
}

export interface WatchFolderState {
  files: Record<string, WatchFolderFileState>;
}

export interface WatchFolderScanResult {
  created: WatchFolderFileState[];
  stabilized: WatchFolderFileState[];
  active: WatchFolderFileState[];
  removed: string[];
}

interface ScanOptions {
  watchDir: string;
  stableObservationCount?: number;
  now?: () => Date;
}

function canWriteSupabase() {
  try {
    getSupabaseDbUrl();
    return true;
  } catch {
    return false;
  }
}

function makeVideoJobId(filePath: string) {
  return `video-job:${createHash("sha1").update(filePath).digest("hex").slice(0, 16)}`;
}

function inferVideoKind(fileName: string) {
  const lowered = fileName.toLowerCase();
  if (lowered.includes("clip")) return "clip" as const;
  if (lowered.includes("recap")) return "recap" as const;
  return "gameplay" as const;
}

async function hashFileSha256(filePath: string) {
  const hash = createHash("sha256");
  const stream = createReadStream(filePath);

  await new Promise<void>((resolve, reject) => {
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve());
    stream.on("error", reject);
  });

  return hash.digest("hex");
}

export async function readWatchFolderState() {
  try {
    return JSON.parse(await readFile(watchFolderStatePath, "utf8")) as WatchFolderState;
  } catch {
    return { files: {} };
  }
}

export async function writeWatchFolderState(state: WatchFolderState) {
  await mkdir(stateDir, { recursive: true });
  await writeFile(watchFolderStatePath, JSON.stringify(state, null, 2));
}

async function promoteStableFile(file: WatchFolderFileState) {
  const rawSha256 = file.rawSha256 ?? (await hashFileSha256(file.filePath));
  const promoted = {
    ...file,
    stage: "raw_received" as const,
    rawSha256,
    videoJobId: file.videoJobId ?? makeVideoJobId(file.filePath)
  };

  if (canWriteSupabase()) {
    await upsertSupabaseVideoJob({
      id: promoted.videoJobId,
      title: path.parse(promoted.fileName).name,
      kind: inferVideoKind(promoted.fileName),
      status: "raw_received",
      assetLinkState: "missing",
      sourceSession: path.parse(promoted.fileName).name,
      transcriptState: "missing",
      highlightCount: 0,
      riskySegmentCount: 0,
      nextAction: "Run auto analysis and create proxy, transcript, and highlight candidates.",
      rawFilePath: promoted.filePath,
      rawFileSizeBytes: promoted.size,
      rawSha256,
      durationMs: null,
      storageTier: "local",
      proxyAssetPath: null,
      previewAssetPath: null
    });

    await recordVideoJobAttempt({
      videoJobId: promoted.videoJobId,
      stage: "raw_received",
      status: "succeeded",
      retryable: false
    });
  }

  return promoted;
}

export async function scanWatchFolderOnce({
  watchDir,
  stableObservationCount = 2,
  now = () => new Date()
}: ScanOptions): Promise<WatchFolderScanResult> {
  const timestamp = now().toISOString();
  const state = await readWatchFolderState();
  const nextState: WatchFolderState = { files: { ...state.files } };
  const created: WatchFolderFileState[] = [];
  const stabilized: WatchFolderFileState[] = [];

  await mkdir(watchDir, { recursive: true });
  const entries = await readdir(watchDir, { withFileTypes: true });
  const seenPaths = new Set<string>();

  for (const entry of entries) {
    if (!entry.isFile()) continue;

    const filePath = path.join(watchDir, entry.name);
    const fileStat = await stat(filePath);
    seenPaths.add(filePath);

    const existing = nextState.files[filePath];
    if (!existing) {
      const fresh: WatchFolderFileState = {
        fileName: entry.name,
        filePath,
        size: fileStat.size,
        mtimeMs: fileStat.mtimeMs,
        observedStableCount: 1,
        stage: "detected",
        firstSeenAt: timestamp,
        lastSeenAt: timestamp,
        videoJobId: null,
        rawSha256: null
      };

      nextState.files[filePath] = fresh;
      created.push(fresh);
      continue;
    }

    const unchanged = existing.size === fileStat.size && existing.mtimeMs === fileStat.mtimeMs;
    const observedStableCount = unchanged ? existing.observedStableCount + 1 : 1;

    let updated: WatchFolderFileState = {
      ...existing,
      fileName: entry.name,
      size: fileStat.size,
      mtimeMs: fileStat.mtimeMs,
      observedStableCount,
      stage:
        existing.videoJobId || observedStableCount >= stableObservationCount
          ? existing.stage
          : "stabilizing",
      lastSeenAt: timestamp
    };

    if (!existing.videoJobId && observedStableCount >= stableObservationCount) {
      updated = await promoteStableFile(updated);
      stabilized.push(updated);
    }

    nextState.files[filePath] = updated;
  }

  const removed = Object.keys(nextState.files).filter((filePath) => !seenPaths.has(filePath));
  for (const filePath of removed) {
    delete nextState.files[filePath];
  }

  await writeWatchFolderState(nextState);

  return {
    created,
    stabilized,
    active: Object.values(nextState.files),
    removed
  };
}

export async function startWatchFolderWorker({
  watchDir,
  pollingIntervalMs = 5_000,
  stableObservationCount = 2
}: {
  watchDir: string;
  pollingIntervalMs?: number;
  stableObservationCount?: number;
}) {
  const watchedFiles = new Set<string>();
  const scan = async () =>
    scanWatchFolderOnce({
      watchDir,
      stableObservationCount
    });

  await scan();

  const attachFileFallbacks = async () => {
    const state = await readWatchFolderState();
    for (const filePath of Object.keys(state.files)) {
      if (watchedFiles.has(filePath) || !existsSync(filePath)) continue;
      watchFile(filePath, { interval: pollingIntervalMs }, () => {
        void scan();
      });
      watchedFiles.add(filePath);
    }
  };

  await attachFileFallbacks();

  const controller = new AbortController();
  let watcher: ReturnType<typeof watch> | null = null;

  try {
    watcher = watch(watchDir, { signal: controller.signal });
    (async () => {
      for await (const _event of watcher!) {
        await scan();
        await attachFileFallbacks();
      }
    })();
  } catch {
    watcher = null;
  }

  const interval = setInterval(() => {
    void scan();
    void attachFileFallbacks();
  }, pollingIntervalMs);

  return {
    close() {
      clearInterval(interval);
      controller.abort();
      for (const filePath of watchedFiles) {
        unwatchFile(filePath);
      }
    }
  };
}
