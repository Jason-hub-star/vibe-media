import type {
  ExceptionQueueItem,
  InboxItem,
  PublishQueueItem,
  ReviewItem
} from "@vibehub/content-contracts";

type ReviewTemplate = ReviewItem;
type RunLike = {
  id: string;
  sourceName: string;
  runStatus: string;
  errorMessage: string | null;
};
type VideoException = ExceptionQueueItem;

export type InboxNextQueue = "review" | "publish" | "archive" | "discard";

export function getHumanExceptionReasons(item: InboxItem): string[] {
  const reasons: string[] = [];

  if (item.targetSurface === "both") {
    reasons.push("dual-surface routing needs operator confirmation");
  }

  if (item.confidence < 0.85) {
    reasons.push("low confidence requires human review");
  }

  if (item.sourceTier === "manual-review-required" || item.sourceTier === "blocked") {
    reasons.push("source tier requires operator review");
  }

  return reasons;
}

export function deriveInboxNextQueue(item: InboxItem): InboxNextQueue {
  if (item.targetSurface === "archive") {
    return "archive";
  }

  if (item.targetSurface === "discard") {
    return "discard";
  }

  if (getHumanExceptionReasons(item).length > 0) {
    return "review";
  }

  return item.stage === "drafted" ? "publish" : "review";
}

export function deriveReviewItemsFromInbox(
  items: InboxItem[],
  templates: ReviewTemplate[]
): ReviewItem[] {
  const templateMap = new Map(templates.map((item) => [item.sourceItemId, item]));

  return items
    .filter((item) => deriveInboxNextQueue(item) === "review")
    .map((item) => templateMap.get(item.id))
    .filter((item): item is ReviewItem => Boolean(item));
}

export function derivePublishQueueItemsFromInbox(items: InboxItem[]): PublishQueueItem[] {
  return items
    .filter(
      (
        item
      ): item is InboxItem & {
        targetSurface: "brief" | "discover" | "both";
      } => deriveInboxNextQueue(item) === "publish"
    )
    .flatMap((item) => {
      const shared = {
        sourceLabel: item.sourceName,
        scheduledFor: item.targetSurface === "discover" ? "2026-03-22T20:00:00.000Z" : "2026-03-22T18:30:00.000Z"
      };

      if (item.targetSurface === "both") {
        return [
          {
            id: `publish-${item.id}-brief`,
            title: item.title,
            targetType: "brief" as const,
            queueStatus: "scheduled" as const,
            nextAction: "Finalize brief metadata and keep the reserved release slot.",
            ...shared
          },
          {
            id: `publish-${item.id}-discover`,
            title: item.title,
            targetType: "discover" as const,
            queueStatus: "scheduled" as const,
            nextAction: "Verify action links before discover release.",
            sourceLabel: item.sourceName,
            scheduledFor: "2026-03-22T20:00:00.000Z"
          }
        ];
      }

      return [
        {
          id: `publish-${item.id}`,
          title: item.title,
          targetType: item.targetSurface,
          queueStatus: "scheduled" as const,
          nextAction:
            item.targetSurface === "discover"
              ? "Recheck outbound links before queue execution."
              : "Keep scheduled slot unless source links or title change.",
          ...shared
        }
      ];
    });
}

export function deriveExceptionQueueItems(
  items: InboxItem[],
  templates: ReviewTemplate[],
  runs: RunLike[],
  videoExceptions: VideoException[]
): ExceptionQueueItem[] {
  const reviewMap = new Map(templates.map((item) => [item.sourceItemId, item]));

  const contentExceptions = items
    .filter((item) => deriveInboxNextQueue(item) === "review")
    .map((item) => {
      const reviewItem = reviewMap.get(item.id);
      const reasons = getHumanExceptionReasons(item);
      const reason = reviewItem?.reviewReason ?? reasons[0] ?? "operator review required";

      return {
        id: `exception-${item.id}`,
        title: reviewItem?.previewTitle ?? item.title,
        targetType: item.targetSurface === "discover" ? "discover" : "brief",
        currentStage: item.stage === "drafted" ? "review" : item.stage,
        reason,
        confidence: item.confidence,
        sourceLabel: item.sourceName,
        nextAction:
          reviewItem?.reviewReason === "quote boundary review needed"
            ? "Trim direct quotes and lock the final tone before publish."
            : "Confirm the final target surface before queueing this item."
      } satisfies ExceptionQueueItem;
    });

  const runExceptions = runs
    .filter((run) => run.runStatus === "failed")
    .map((run) => ({
      id: `exception-${run.id}`,
      title: run.sourceName,
      targetType: "discover" as const,
      currentStage: "failed" as const,
      reason: run.errorMessage ?? "ingest run failed",
      confidence: 0.66,
      sourceLabel: run.sourceName,
      nextAction: "Retry browser render and verify outbound links."
    }));

  return [...contentExceptions, ...runExceptions, ...videoExceptions];
}
