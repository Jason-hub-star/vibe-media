import type {
  ExceptionQueueItem,
  InboxItem,
  InboxItemStage,
  InboxTargetSurface,
  IngestRun,
  PublishQueueItem,
  ReviewItem
} from "@vibehub/content-contracts";
import {
  deriveExceptionQueueEntries,
  deriveInboxNextQueue,
  derivePublishQueueEntriesFromInbox,
  deriveReviewEntriesFromInbox,
  getHumanExceptionReasons
} from "./pipeline-routing";
import { inferTargetSurfaceFromTags } from "./discover-category-routing";
import type { IngestSourceFixture } from "./ingest-source-fixtures";
import { ingestSourceFixtures } from "./ingest-source-fixtures";

export interface BriefDiscoverCycleReport {
  cycleStartedAt: string;
  sourcesTouched: number;
  inboxItems: InboxItem[];
  ingestRuns: IngestRun[];
  reviewItems: ReviewItem[];
  publishItems: PublishQueueItem[];
  exceptionItems: ExceptionQueueItem[];
  archiveItems: InboxItem[];
  discardItems: InboxItem[];
}

function clampConfidence(value: number) {
  return Math.max(0.5, Math.min(0.99, Number(value.toFixed(2))));
}

function inferTargetSurface(fixture: IngestSourceFixture): InboxTargetSurface {
  if (fixture.duplicateOf) {
    return "discard";
  }

  if (fixture.archiveOnly) {
    return "archive";
  }

  return inferTargetSurfaceFromTags(fixture.tags);
}

function inferConfidence(fixture: IngestSourceFixture, targetSurface: InboxTargetSurface) {
  const baseByTier = {
    "auto-safe": 0.93,
    "render-required": 0.88,
    "manual-review-required": 0.8,
    blocked: 0.6
  } as const;

  const tierBase = baseByTier[fixture.sourceTier];
  const targetBonus = targetSurface === "brief" ? 0.02 : targetSurface === "discover" ? 0 : -0.01;
  const transcriptPenalty = fixture.tags.includes("transcript") ? -0.04 : 0;

  return clampConfidence(tierBase + targetBonus + transcriptPenalty);
}

function inferStage(targetSurface: InboxTargetSurface, reasons: string[]): InboxItemStage {
  if (targetSurface === "archive" || targetSurface === "discard") {
    return "classified";
  }

  return reasons.length > 0 ? "classified" : "drafted";
}

/** content-failed 또는 summary-only + 짧은 요약이면 review 강제 사유 반환 */
function getContentQualityReasons(fixture: IngestSourceFixture): string[] {
  const reasons: string[] = [];

  if (fixture.parseStatus === "content-failed") {
    reasons.push("body extraction failed — content too thin for publication");
  }

  if (fixture.parseStatus === "summary-only" && fixture.parsedSummary.length < 100) {
    reasons.push("summary-only with insufficient detail for brief");
  }

  return reasons;
}

function createInboxItem(fixture: IngestSourceFixture): InboxItem {
  const targetSurface = inferTargetSurface(fixture);
  const confidence = inferConfidence(fixture, targetSurface);
  const contentQualityReasons = getContentQualityReasons(fixture);

  // content-failed이면 confidence 페널티 적용
  const adjustedConfidence = contentQualityReasons.length > 0
    ? clampConfidence(confidence - 0.1)
    : confidence;

  const provisional: InboxItem = {
    id: fixture.id,
    sourceName: fixture.sourceName,
    sourceTier: fixture.sourceTier,
    title: fixture.title,
    contentType: fixture.contentType,
    stage: "classified",
    targetSurface,
    confidence: adjustedConfidence,
    parsedSummary: fixture.parsedSummary
  };
  const reasons = [...getHumanExceptionReasons(provisional), ...contentQualityReasons];

  return {
    ...provisional,
    stage: inferStage(targetSurface, reasons)
  };
}

function createReviewTemplates(items: InboxItem[]): ReviewItem[] {
  return items
    .filter((item) => deriveInboxNextQueue(item) === "review")
    .map((item) => ({
      id: `review-${item.id}`,
      sourceItemId: item.id,
      sourceLabel: item.sourceName,
      sourceHref: `https://example.com/${item.id}`,
      sourceExcerpt: item.parsedSummary,
      parsedSummary: item.parsedSummary,
      keyPoints: [
        `target surface ${item.targetSurface}`,
        `next queue ${deriveInboxNextQueue(item)}`,
        `source tier ${item.sourceTier}`
      ],
      targetSurface: item.targetSurface === "discover" ? "discover" : "brief",
      reviewReason: getHumanExceptionReasons(item)[0] ?? "operator review required",
      confidence: item.confidence,
      previewTitle: item.title,
      previewSummary: item.parsedSummary
    }));
}

function createIngestRuns(items: InboxItem[], cycleStartedAt: string): IngestRun[] {
  const grouped = new Map<string, InboxItem[]>();

  for (const item of items) {
    const current = grouped.get(item.sourceName) ?? [];
    current.push(item);
    grouped.set(item.sourceName, current);
  }

  return Array.from(grouped.entries()).map(([sourceName, sourceItems], index) => {
    const statuses = sourceItems.map((item) => deriveInboxNextQueue(item));
    const runStatus =
      statuses.includes("publish")
        ? "drafted"
        : statuses.includes("review")
          ? "review"
          : "classified";

    return {
      id: `run-${index + 1}-${sourceName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      sourceName,
      runStatus,
      startedAt: cycleStartedAt,
      finishedAt: cycleStartedAt,
      itemCount: sourceItems.length,
      errorMessage: null
    };
  });
}

export function runBriefDiscoverCycle(
  fixtures: IngestSourceFixture[] = ingestSourceFixtures,
  cycleStartedAt = "2026-03-22T09:00:00.000Z"
): BriefDiscoverCycleReport {
  const inboxItems = fixtures.map(createInboxItem);
  const reviewTemplates = createReviewTemplates(inboxItems);
  const ingestRuns = createIngestRuns(inboxItems, cycleStartedAt);
  const reviewItems = deriveReviewEntriesFromInbox(inboxItems, reviewTemplates);
  const publishItems = derivePublishQueueEntriesFromInbox(inboxItems);
  const exceptionItems = deriveExceptionQueueEntries(inboxItems, reviewTemplates, ingestRuns, []);
  const archiveItems = inboxItems.filter((item) => deriveInboxNextQueue(item) === "archive");
  const discardItems = inboxItems.filter((item) => deriveInboxNextQueue(item) === "discard");

  return {
    cycleStartedAt,
    sourcesTouched: new Set(inboxItems.map((item) => item.sourceName)).size,
    inboxItems,
    ingestRuns,
    reviewItems,
    publishItems,
    exceptionItems,
    archiveItems,
    discardItems
  };
}
