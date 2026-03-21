import type { InboxTargetSurface } from "./inbox";

export interface ReviewItem {
  id: string;
  sourceLabel: string;
  sourceHref: string;
  sourceExcerpt: string;
  parsedSummary: string;
  keyPoints: string[];
  targetSurface: InboxTargetSurface;
  confidence: number;
  previewTitle: string;
  previewSummary: string;
}
