export type VideoJobStatus =
  | "raw_received"
  | "analysis_running"
  | "auto_cut_done"
  | "highlight_candidates_ready"
  | "capcut_pending"
  | "capcut_in_progress"
  | "capcut_done"
  | "parent_review"
  | "upload_ready"
  | "uploaded_private"
  | "published"
  | "blocked";

export type VideoJobKind = "gameplay" | "recap" | "clip";
export type TranscriptState = "missing" | "draft" | "approved";

export interface VideoJob {
  id: string;
  title: string;
  kind: VideoJobKind;
  status: VideoJobStatus;
  assetLinkState: "missing" | "partial" | "complete";
  sourceSession: string;
  transcriptState: TranscriptState;
  highlightCount: number;
  riskySegmentCount: number;
  exceptionReason: string | null;
  nextAction: string;
}
