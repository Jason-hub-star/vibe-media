export type InboxItemContentType = "article" | "repo" | "event" | "contest" | "pdf" | "doc";

export type InboxItemStage = "parsed" | "classified" | "drafted";

export type InboxTargetSurface = "brief" | "discover" | "both" | "archive" | "discard";

export interface InboxItem {
  id: string;
  sourceName: string;
  sourceTier: "auto-safe" | "render-required" | "manual-review-required" | "blocked";
  title: string;
  contentType: InboxItemContentType;
  stage: InboxItemStage;
  targetSurface: InboxTargetSurface;
  confidence: number;
  parsedSummary: string;
}
