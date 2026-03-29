import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type {
  ExceptionQueueItem,
  DiscoverCategory,
  InboxItem,
  IngestRun,
  PublishQueueItem,
  ReviewItem,
  SourceEntry
} from "@vibehub/content-contracts";

import { inferDiscoverCategoryFromTags } from "./discover-category-routing";
import { getHumanExceptionReasons } from "./pipeline-routing";
import type { LiveSourceFetchReport } from "./live-source-fetch";
import type { LiveSourceDefinition } from "./live-source-registry";
import { liveSourceRegistry } from "./live-source-registry";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const snapshotDir = path.resolve(__dirname, "../../state");
export const liveIngestSnapshotPath = path.join(snapshotDir, "live-ingest-snapshot.json");

export interface SnapshotSourceRow {
  id: string;
  name: string;
  kind: string;
  base_url: string;
  source_tier: "auto-safe" | "render-required" | "manual-review-required";
  pipeline_lane: "editorial" | "tool_candidate";
  enabled: boolean;
  last_success_at: string | null;
  last_failure_at: string | null;
  failure_reason: string | null;
  created_at: string;
}

export interface SnapshotIngestRunRow {
  id: string;
  source_id: string;
  run_status: IngestRun["runStatus"];
  started_at: string;
  finished_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface SnapshotIngestedItemRow {
  id: string;
  source_id: string;
  run_id: string | null;
  title: string;
  url: string;
  content_type: InboxItem["contentType"];
  raw_content: Record<string, unknown>;
  parsed_content: Record<string, unknown>;
  dedupe_key: string;
  ingest_status: "fetched" | "parsed" | "failed";
  created_at: string;
}

export interface SnapshotItemClassificationRow {
  id: string;
  item_id: string;
  category: string;
  importance_score: number;
  novelty_score: number;
  target_surface: InboxItem["targetSurface"];
  reason: string;
  duplicate_of: string | null;
  confidence: number;
  policy_flags: string[];
  exception_reason: string | null;
  created_at: string;
}

export interface LiveIngestSnapshot {
  generatedAt: string;
  tables: {
    sources: SnapshotSourceRow[];
    ingest_runs: SnapshotIngestRunRow[];
    ingested_items: SnapshotIngestedItemRow[];
    item_classifications: SnapshotItemClassificationRow[];
  };
  projections: {
    sourceEntries: SourceEntry[];
    ingestRuns: IngestRun[];
    inboxItems: InboxItem[];
    reviewItems: ReviewItem[];
    publishQueueItems: PublishQueueItem[];
    exceptionQueueItems: ExceptionQueueItem[];
  };
}

function makeId(prefix: string, value: string) {
  return `${prefix}-${createHash("sha1").update(value).digest("hex").slice(0, 12)}`;
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function toSnapshotSourceId(sourceId: string) {
  return isUuidLike(sourceId) ? sourceId : makeId("source", sourceId);
}

function inferSourceCategory(source: LiveSourceDefinition): SourceEntry["category"] {
  if (source.fetchKind === "github-releases") return "release";
  if (source.sourceName.includes("Research")) return "research";
  return "company";
}

function inferSourceFreshness(source: LiveSourceDefinition): SourceEntry["freshness"] {
  return source.fetchKind === "github-releases" ? "daily" : "weekly";
}

function inferClassificationCategory(item: InboxItem, tags: string[]) {
  const discoverCategory = inferDiscoverCategoryFromTags(tags);

  if (discoverCategory) return discoverCategory;
  if (item.targetSurface === "brief") return "analysis";
  if (item.targetSurface === "archive") return "archive";
  return (tags[0] as DiscoverCategory | string) ?? "analysis";
}

function buildDuplicateMap(items: Array<Pick<SnapshotIngestedItemRow, "id" | "dedupe_key">>) {
  const canonicalByKey = new Map<string, string>();
  const duplicateOfByItemId = new Map<string, string | null>();

  for (const item of items) {
    const existing = canonicalByKey.get(item.dedupe_key);
    if (!existing) {
      canonicalByKey.set(item.dedupe_key, item.id);
      duplicateOfByItemId.set(item.id, null);
      continue;
    }

    duplicateOfByItemId.set(item.id, existing);
  }

  return duplicateOfByItemId;
}

export function readLiveIngestSnapshot() {
  try {
    return JSON.parse(readFileSync(liveIngestSnapshotPath, "utf8")) as LiveIngestSnapshot;
  } catch {
    return null;
  }
}

export function writeLiveIngestSnapshot(snapshot: LiveIngestSnapshot) {
  mkdirSync(snapshotDir, { recursive: true });
  writeFileSync(liveIngestSnapshotPath, JSON.stringify(snapshot, null, 2));
}

export function materializeLiveIngestSnapshot(
  report: LiveSourceFetchReport,
  registry: LiveSourceDefinition[] = report.sources ?? liveSourceRegistry
): LiveIngestSnapshot {
  const sourceStatuses = new Map(report.sourceStatuses.map((status) => [status.sourceId, status]));
  const projectedRunsByName = new Map(report.cycleReport.ingestRuns.map((run) => [run.sourceName, run]));
  const inboxById = new Map(report.cycleReport.inboxItems.map((item) => [item.id, item]));

  const sources = registry.map((source) => {
    const status = sourceStatuses.get(source.id);
    const snapshotSourceId = toSnapshotSourceId(source.id);

    return {
      id: snapshotSourceId,
      name: source.sourceName,
      kind: source.fetchKind,
      base_url: source.href,
      source_tier: source.sourceTier,
      pipeline_lane: source.pipelineLane,
      enabled: source.enabled,
      last_success_at: status?.status === "fetched" ? report.performedAt : null,
      last_failure_at: status?.status === "failed" ? report.performedAt : null,
      failure_reason: status?.status === "failed" || status?.status === "skipped" ? status.note : null,
      created_at: report.performedAt
    } satisfies SnapshotSourceRow;
  });

  const sourceIdByName = new Map(sources.map((source) => [source.name, source.id]));

  const ingestRuns: SnapshotIngestRunRow[] = [];
  for (const status of report.sourceStatuses) {
    if (status.status === "skipped") continue;

    const projectedRun = projectedRunsByName.get(status.sourceName);
    ingestRuns.push({
      id: makeId("run", `${status.sourceId}:${report.performedAt}`),
      source_id: sourceIdByName.get(status.sourceName) ?? toSnapshotSourceId(status.sourceId),
      run_status: projectedRun?.runStatus ?? (status.status === "failed" ? "failed" : "parsed"),
      started_at: report.performedAt,
      finished_at: report.performedAt,
      error_message: status.status === "failed" ? status.note : null,
      created_at: report.performedAt
    });
  }

  const runIdBySourceName = new Map(
    ingestRuns.map((run) => {
      const source = sources.find((entry) => entry.id === run.source_id);
      return [source?.name ?? "", run.id];
    })
  );

  const ingestedItems = report.items.map((item) => ({
    id: item.id,
    source_id: sourceIdByName.get(item.sourceName) ?? toSnapshotSourceId(item.sourceId),
    run_id: runIdBySourceName.get(item.sourceName) ?? null,
    title: item.title,
    url: item.url,
    content_type: item.contentType,
    raw_content: {
      publishedAt: item.publishedAt,
      url: item.url,
      sourceId: item.sourceId
    },
    parsed_content: {
      summary: item.parsedSummary,
      contentMarkdown: item.contentMarkdown ?? null,
      parserName: item.parserName,
      parseStatus: item.parseStatus,
      tags: item.tags,
      imageUrl: item.imageUrl ?? null
    },
    dedupe_key: createHash("sha1").update(item.url.toLowerCase()).digest("hex"),
    // content-failed 항목은 "parsed"가 아닌 "failed"로 분류 — downstream에서 draft 생성 차단
    ingest_status: (item.parseStatus === "content-failed" ? "failed" : "parsed") as SnapshotIngestedItemRow["ingest_status"],
    created_at: report.performedAt
  }));

  const itemClassifications: SnapshotItemClassificationRow[] = ingestedItems.map((item) => {
    const inboxItem = inboxById.get(item.id);
    const tags = Array.isArray(item.parsed_content.tags) ? (item.parsed_content.tags as string[]) : [];
    const reasons = inboxItem ? getHumanExceptionReasons(inboxItem) : [];

    return {
      id: makeId("classification", item.id),
      item_id: item.id,
      category: inferClassificationCategory(
        inboxItem ?? {
          id: item.id,
          sourceName: sources.find((source) => source.id === item.source_id)?.name ?? "Unknown",
          sourceTier: "auto-safe",
          title: item.title,
          contentType: item.content_type,
          stage: "classified",
          targetSurface: "brief",
          confidence: 0.8,
          parsedSummary: String(item.parsed_content.summary ?? "")
        },
        tags
      ),
      importance_score: inboxItem ? Number((inboxItem.confidence * 100).toFixed(2)) : 80,
      novelty_score: item.content_type === "repo" ? 78 : 72,
      target_surface: inboxItem?.targetSurface ?? "brief",
      reason: reasons[0] ?? `live fetch classification for ${item.title}`,
      duplicate_of: null,
      confidence: inboxItem ? Number(inboxItem.confidence.toFixed(2)) : 0.8,
      policy_flags: [],
      exception_reason: reasons[0] ?? null,
      created_at: report.performedAt
    };
  });

  const duplicateOfByItemId = buildDuplicateMap(ingestedItems);

  for (const classification of itemClassifications) {
    const duplicateOf = duplicateOfByItemId.get(classification.item_id) ?? null;
    if (!duplicateOf) continue;

    classification.duplicate_of = duplicateOf;
    classification.target_surface = "archive";
    classification.reason = `duplicate of ${duplicateOf}`;
    classification.policy_flags = Array.from(new Set([...classification.policy_flags, "duplicate"]));
    classification.exception_reason = null;
  }

  const sourceEntries: SourceEntry[] = registry.map((source) => ({
    id: makeId("source-entry", source.id),
    label: source.sourceName,
    category: inferSourceCategory(source),
    href: source.href,
    freshness: inferSourceFreshness(source)
  }));

  const projectionRuns: IngestRun[] = report.sourceStatuses
    .filter((status) => status.status !== "skipped")
    .map((status) => {
      const projectedRun = projectedRunsByName.get(status.sourceName);
      return {
        id: makeId("run-view", `${status.sourceId}:${report.performedAt}`),
        sourceName: status.sourceName,
        runStatus: projectedRun?.runStatus ?? (status.status === "failed" ? "failed" : "parsed"),
        startedAt: report.performedAt,
        finishedAt: report.performedAt,
        itemCount: status.itemCount,
        errorMessage: status.status === "failed" ? status.note : null
      };
    });

  return {
    generatedAt: report.performedAt,
    tables: {
      sources,
      ingest_runs: ingestRuns,
      ingested_items: ingestedItems,
      item_classifications: itemClassifications
    },
    projections: {
      sourceEntries,
      ingestRuns: projectionRuns,
      inboxItems: report.cycleReport.inboxItems,
      reviewItems: report.cycleReport.reviewItems,
      publishQueueItems: report.cycleReport.publishItems,
      exceptionQueueItems: report.cycleReport.exceptionItems
    }
  };
}
