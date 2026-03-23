export type RunStatus =
  | "queued"
  | "fetching"
  | "parsed"
  | "classified"
  | "drafted"
  | "review"
  | "approved"
  | "scheduled"
  | "published"
  | "failed";

export interface IngestRun {
  id: string;
  sourceName: string;
  runStatus: RunStatus;
  startedAt: string;
  finishedAt: string | null;
  itemCount: number;
  errorMessage: string | null;
}

export interface IngestRunDetail extends IngestRun {
  stageLog: Array<{ stage: string; status: string; timestamp: string }>;
  itemBreakdown: Array<{ title: string; surface: string }>;
}
