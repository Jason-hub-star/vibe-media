import type { AutomationTrailEntry } from "@vibehub/content-contracts";

const RUN_HISTORY_KEY = "pipeline-run-history";

interface StoredRun {
  id: string;
  timestamp: string;
  stages: Array<{
    id: string;
    status: string;
    itemCount?: number;
  }>;
  totalDurationMs?: number;
  highlights?: string[];
}

/**
 * Read pipeline run history from localStorage-backed state.
 * In SSR this returns an empty array; the client PipelineMonitor
 * populates localStorage after each run.
 */
export function getAutomationTrail(): AutomationTrailEntry[] {
  if (typeof globalThis.localStorage === "undefined") return [];

  try {
    const raw = globalThis.localStorage.getItem(RUN_HISTORY_KEY);
    if (!raw) return [];
    const runs: StoredRun[] = JSON.parse(raw);

    return runs.map((r) => {
      const total = r.stages.length;
      const completed = r.stages.filter((s) => s.status === "done").length;
      const errors = r.stages.filter((s) => s.status === "error").length;
      const items = r.stages.reduce((sum, s) => sum + (s.itemCount ?? 0), 0);

      return {
        runId: r.id,
        timestamp: r.timestamp,
        triggerType: "manual" as const,
        stagesCompleted: completed,
        stagesTotal: total,
        itemsProcessed: items,
        errors,
        highlights: r.highlights ?? [],
      };
    });
  } catch {
    return [];
  }
}
