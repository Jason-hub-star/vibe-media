export type VideoJobStatus =
  | "collected"
  | "drafted"
  | "asset_pending"
  | "review"
  | "ready";

export type VideoJobKind = "gameplay" | "recap" | "clip";

export interface VideoJob {
  id: string;
  title: string;
  kind: VideoJobKind;
  status: VideoJobStatus;
  assetLinkState: "missing" | "partial" | "complete";
  sourceSession: string;
}
