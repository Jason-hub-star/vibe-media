export type PipelineStageStatus = "idle" | "running" | "done" | "error";

export interface PipelineStage {
  id: string;
  label: string;
  description: string;
  status: PipelineStageStatus;
  itemCount?: number;
  errorMessage?: string;
  durationMs?: number;
  sources?: SourceResult[];
}

export interface SourceResult {
  id: string;
  items: number;
  ok: boolean;
  error?: string;
}

export interface PipelineRunResult {
  timestamp: number;
  stages: PipelineStage[];
  totalDurationMs: number;
  totalItems: number;
  errorCount: number;
}

export const STAGE_ADMIN_ROUTES: Record<string, string> = {
  fetch: "/admin/sources",
  ingest: "/admin/inbox",
  classify: "/admin/inbox",
  sync: "/admin/runs",
  review: "/admin/review",
  publish: "/admin/publish",
};

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: "fetch",
    label: "Source Fetch",
    description: "OpenAI News, Google AI Blog, GitHub Releases",
    status: "idle",
  },
  {
    id: "ingest",
    label: "Ingest",
    description: "Parse, dedupe, store snapshot",
    status: "idle",
  },
  {
    id: "classify",
    label: "Classification",
    description: "brief / discover / archive / discard",
    status: "idle",
  },
  {
    id: "sync",
    label: "Supabase Sync",
    description: "Upsert to remote tables",
    status: "idle",
  },
  {
    id: "review",
    label: "Review",
    description: "Operator approval queue",
    status: "idle",
  },
  {
    id: "publish",
    label: "Publish",
    description: "Schedule and release",
    status: "idle",
  },
];

export function stageStatusLabel(status: PipelineStageStatus): string {
  switch (status) {
    case "idle": return "대기";
    case "running": return "실행 중";
    case "done": return "완료";
    case "error": return "오류";
  }
}
