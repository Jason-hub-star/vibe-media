import type { InboxTargetSurface } from "./inbox";

export type ReviewStatus = "pending" | "approved" | "changes_requested" | "rejected";

export interface ReviewItem {
  id: string;
  sourceItemId: string;
  sourceLabel: string;
  sourceHref: string;
  sourceExcerpt: string;
  parsedSummary: string;
  keyPoints: string[];
  targetSurface: InboxTargetSurface;
  reviewReason: string;
  confidence: number;
  previewTitle: string;
  previewSummary: string;
  reviewStatus?: ReviewStatus;
}
