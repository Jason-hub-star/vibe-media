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
