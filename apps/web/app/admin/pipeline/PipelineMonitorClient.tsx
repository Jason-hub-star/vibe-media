"use client";

import { useCallback, useState } from "react";
import { PipelineMonitor } from "@/features/pipeline-monitor/view/PipelineMonitor";
import { PipelineDetailPanel } from "@/features/pipeline-monitor/view/PipelineDetailPanel";
import { PipelineResultsSummary } from "@/features/pipeline-monitor/view/PipelineResultsSummary";
import { PipelineSelfImprovePanel } from "@/features/pipeline-monitor/view/PipelineSelfImprovePanel";
import type { PipelineStage, PipelineRunResult } from "@/features/pipeline-monitor/pipeline-types";
import { PIPELINE_STAGES } from "@/features/pipeline-monitor/pipeline-types";

const RUN_HISTORY_KEY = "vibehub:pipeline-run-history";
const MAX_HISTORY = 5;

function cloneStages(stages: PipelineStage[]): PipelineStage[] {
  return stages.map((s) => ({ ...s }));
}

function updateStage(
  stages: PipelineStage[],
  id: string,
  patch: Partial<PipelineStage>,
): PipelineStage[] {
  return stages.map((s) => (s.id === id ? { ...s, ...patch } : s));
}

function loadRunHistory(): PipelineRunResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RUN_HISTORY_KEY);
    return raw ? (JSON.parse(raw) as PipelineRunResult[]) : [];
  } catch {
    return [];
  }
}

function saveRunHistory(history: PipelineRunResult[]): void {
  try {
    localStorage.setItem(RUN_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch {
    // localStorage may be unavailable
  }
}

export function PipelineMonitorClient() {
  const [stages, setStages] = useState<PipelineStage[]>(() => cloneStages(PIPELINE_STAGES));
  const [running, setRunning] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [runHistory, setRunHistory] = useState<PipelineRunResult[]>(loadRunHistory);

  const handleNodeSelect = useCallback((stageId: string) => {
    setSelectedStageId((prev) => (prev === stageId ? null : stageId));
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedStageId(null);
  }, []);

  const runPipeline = useCallback(async () => {
    setRunning(true);
    const startTime = Date.now();
    let current = cloneStages(PIPELINE_STAGES);
    setStages(current);

    const steps = [
      { id: "fetch", action: "/api/pipeline/fetch" },
      { id: "ingest", action: "/api/pipeline/ingest" },
      { id: "classify", action: null },
      { id: "sync", action: "/api/pipeline/sync" },
      { id: "review", action: null },
      { id: "publish", action: null },
    ];

    for (const step of steps) {
      current = updateStage(current, step.id, { status: "running" });
      setStages([...current]);

      try {
        if (step.action) {
          const res = await fetch(step.action, { method: "POST" });
          const data = await res.json();

          if (!res.ok) {
            current = updateStage(current, step.id, {
              status: "error",
              errorMessage: data.error ?? "Unknown error",
            });
            setStages([...current]);
            break;
          }

          current = updateStage(current, step.id, {
            status: "done",
            itemCount: data.itemCount,
            durationMs: data.durationMs,
            sources: data.sources,
          });
        } else {
          // Stages without API endpoint — mark done immediately
          await new Promise((r) => setTimeout(r, 300));
          current = updateStage(current, step.id, { status: "done" });
        }

        setStages([...current]);
      } catch (err) {
        current = updateStage(current, step.id, {
          status: "error",
          errorMessage: err instanceof Error ? err.message : "Network error",
        });
        setStages([...current]);
        break;
      }
    }

    // Build run result and persist to history
    const totalDurationMs = Date.now() - startTime;
    const totalItems = current.reduce((sum, s) => sum + (s.itemCount ?? 0), 0);
    const errorCount = current.filter((s) => s.status === "error").length;

    const result: PipelineRunResult = {
      timestamp: Date.now(),
      stages: cloneStages(current),
      totalDurationMs,
      totalItems,
      errorCount,
    };

    setRunHistory((prev) => {
      const next = [result, ...prev].slice(0, MAX_HISTORY);
      saveRunHistory(next);
      return next;
    });

    setRunning(false);
  }, []);

  const selectedStage = selectedStageId
    ? stages.find((s) => s.id === selectedStageId) ?? null
    : null;

  const hasResults = stages.some((s) => s.status === "done" || s.status === "error");

  return (
    <div className="pipeline-monitor-wrapper">
      <PipelineMonitor
        stages={stages}
        onRunPipeline={runPipeline}
        running={running}
        onNodeSelect={handleNodeSelect}
      />
      {selectedStage && (
        <PipelineDetailPanel stage={selectedStage} onClose={handleCloseDetail} />
      )}
      {hasResults && !running && (
        <PipelineResultsSummary stages={stages} runHistory={runHistory} />
      )}
      <PipelineSelfImprovePanel runHistory={runHistory} />
    </div>
  );
}
