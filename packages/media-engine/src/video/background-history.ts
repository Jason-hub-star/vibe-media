import fs from "fs/promises";
import path from "path";
import type { PexelsOrientation } from "../image/pexels-video-client";
import type { VideoFormat } from "./script-generator";

export interface BackgroundHistoryEntry {
  id: number;
  orientation: PexelsOrientation;
  slug: string;
  format: VideoFormat;
  usedAt: string;
}

export interface BackgroundHistoryStore {
  version: 1;
  entries: BackgroundHistoryEntry[];
  updatedAt: string;
}

const MAX_HISTORY_ENTRIES = 800;

function isOrientation(value: unknown): value is PexelsOrientation {
  return value === "portrait" || value === "landscape";
}

function isVideoFormat(value: unknown): value is VideoFormat {
  return value === "shorts" || value === "longform";
}

function sanitizeEntries(raw: unknown): BackgroundHistoryEntry[] {
  if (!Array.isArray(raw)) return [];

  const entries: BackgroundHistoryEntry[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;

    const id = Number((row as { id?: unknown }).id);
    const orientation = (row as { orientation?: unknown }).orientation;
    const slug = (row as { slug?: unknown }).slug;
    const format = (row as { format?: unknown }).format;
    const usedAt = (row as { usedAt?: unknown }).usedAt;

    if (!Number.isFinite(id) || id <= 0) continue;
    if (!isOrientation(orientation)) continue;
    if (typeof slug !== "string" || slug.length === 0) continue;
    if (!isVideoFormat(format)) continue;
    if (typeof usedAt !== "string" || usedAt.length === 0) continue;

    entries.push({ id, orientation, slug, format, usedAt });
  }

  return entries;
}

export function createEmptyBackgroundHistory(): BackgroundHistoryStore {
  return {
    version: 1,
    entries: [],
    updatedAt: new Date().toISOString(),
  };
}

export async function readBackgroundHistory(
  historyPath: string,
): Promise<BackgroundHistoryStore> {
  try {
    const raw = await fs.readFile(historyPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<BackgroundHistoryStore>;
    const entries = sanitizeEntries(parsed.entries);
    return {
      version: 1,
      entries,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return createEmptyBackgroundHistory();
  }
}

export function getRecentExcludedBackgroundIds(
  history: BackgroundHistoryStore,
  orientation: PexelsOrientation,
  limit: number = 80,
  options?: {
    now?: Date;
    maxAgeDays?: number;
  },
): Set<number> {
  if (limit <= 0) return new Set<number>();

  const out = new Set<number>();
  const nowMs = (options?.now ?? new Date()).getTime();
  const maxAgeDays = options?.maxAgeDays;
  const maxAgeMs =
    typeof maxAgeDays === "number" && Number.isFinite(maxAgeDays) && maxAgeDays > 0
      ? maxAgeDays * 24 * 60 * 60 * 1000
      : null;

  for (let i = history.entries.length - 1; i >= 0; i--) {
    const entry = history.entries[i]!;
    if (entry.orientation !== orientation) continue;
    if (maxAgeMs !== null) {
      const usedAtMs = Date.parse(entry.usedAt);
      if (Number.isFinite(usedAtMs)) {
        if (nowMs - usedAtMs > maxAgeMs) continue;
      }
    }
    out.add(entry.id);
    if (out.size >= limit) break;
  }
  return out;
}

export function appendBackgroundHistory(
  history: BackgroundHistoryStore,
  input: {
    orientation: PexelsOrientation;
    slug: string;
    format: VideoFormat;
    ids: number[];
    usedAt?: string;
  },
): BackgroundHistoryStore {
  const usedAt = input.usedAt ?? new Date().toISOString();
  const nextEntries = [...history.entries];

  for (const id of input.ids) {
    if (!Number.isFinite(id) || id <= 0) continue;
    nextEntries.push({
      id,
      orientation: input.orientation,
      slug: input.slug,
      format: input.format,
      usedAt,
    });
  }

  const trimmed = nextEntries.slice(-MAX_HISTORY_ENTRIES);
  return {
    version: 1,
    entries: trimmed,
    updatedAt: usedAt,
  };
}

export async function writeBackgroundHistory(
  historyPath: string,
  history: BackgroundHistoryStore,
): Promise<void> {
  await fs.mkdir(path.dirname(historyPath), { recursive: true });
  await fs.writeFile(historyPath, JSON.stringify(history, null, 2), "utf-8");
}
