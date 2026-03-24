"use client";

import Link from "next/link";
import type { PipelineStage, PipelineRunResult } from "../pipeline-types";
import { STAGE_ADMIN_ROUTES, stageStatusLabel } from "../pipeline-types";

interface PipelineResultsSummaryProps {
  stages: PipelineStage[];
  runHistory: PipelineRunResult[];
}

function formatDuration(ms: number | undefined): string {
  if (ms === undefined) return "-";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PipelineResultsSummary({
  stages,
  runHistory,
}: PipelineResultsSummaryProps) {
  const doneStages = stages.filter((s) => s.status === "done");
  const errorStages = stages.filter((s) => s.status === "error");

  const summaryParts = doneStages
    .filter((s) => s.itemCount !== undefined && s.itemCount > 0)
    .map((s) => `${s.itemCount}건 ${s.label}`);

  const inboxStage = stages.find((s) => s.id === "ingest" || s.id === "classify");
  const inboxCount = inboxStage?.itemCount ?? 0;

  const recentRuns = runHistory.slice(0, 5);

  return (
    <div className="pipeline-results-summary">
      {/* ── Summary card ── */}
      <div className="pipeline-summary-card">
        <h3 className="pipeline-summary-title">Pipeline Results</h3>
        <p className="pipeline-summary-text">
          {summaryParts.length > 0
            ? summaryParts.join(", ")
            : "아직 완료된 스테이지가 없습니다"}
        </p>
      </div>

      {/* ── Stage-by-stage table ── */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Stage</th>
              <th>Duration</th>
              <th>Items</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {stages.map((stage) => (
              <tr key={stage.id}>
                <td>{stage.label}</td>
                <td>{formatDuration(stage.durationMs)}</td>
                <td>{stage.itemCount ?? "-"}</td>
                <td>
                  <span className={`pipeline-node-badge pipeline-badge-${stage.status}`}>
                    {stageStatusLabel(stage.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Related page links ── */}
      {inboxCount > 0 && (
        <div className="pipeline-related-links">
          <Link href={STAGE_ADMIN_ROUTES.ingest ?? "/admin/collection"}>
            Inbox에 {inboxCount}건 신규 &rarr; 보러 가기
          </Link>
        </div>
      )}

      {/* ── Error panel ── */}
      {errorStages.length > 0 && (
        <div className="pipeline-error-panel">
          <h4 className="pipeline-error-panel-title">Errors</h4>
          <ul className="pipeline-error-list">
            {errorStages.map((stage) => (
              <li key={stage.id}>
                <strong>{stage.label}</strong>: {stage.errorMessage ?? "Unknown error"}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Run history table ── */}
      {recentRuns.length > 0 && (
        <>
          <h4 className="pipeline-history-title">Recent Runs</h4>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Items</th>
                  <th>Duration</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((run) => (
                  <tr key={run.timestamp}>
                    <td>{formatTimestamp(run.timestamp)}</td>
                    <td>{run.totalItems}</td>
                    <td>{formatDuration(run.totalDurationMs)}</td>
                    <td>
                      <span
                        className={`pipeline-node-badge ${
                          run.errorCount > 0
                            ? "pipeline-badge-error"
                            : "pipeline-badge-done"
                        }`}
                      >
                        {run.errorCount > 0
                          ? `${run.errorCount}건 실패`
                          : "성공"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
