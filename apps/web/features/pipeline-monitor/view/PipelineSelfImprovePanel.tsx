"use client";

import type { PipelineRunResult } from "../pipeline-types";
import {
  computeSourceHealth,
  type SourceHealthEntry,
} from "../self-improve/source-reliability";

interface PipelineSelfImprovePanelProps {
  runHistory: PipelineRunResult[];
}

const STATUS_BADGE_CLASS: Record<SourceHealthEntry["status"], string> = {
  healthy: "pipeline-badge-done",
  degrading: "pipeline-badge-running",
  failing: "pipeline-badge-error",
};

const STATUS_LABEL: Record<SourceHealthEntry["status"], string> = {
  healthy: "Healthy",
  degrading: "Degrading",
  failing: "Failing",
};

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}

export function PipelineSelfImprovePanel({
  runHistory,
}: PipelineSelfImprovePanelProps) {
  const entries = computeSourceHealth(runHistory);

  return (
    <div className="pipeline-self-improve-panel">
      <h3 className="pipeline-summary-title">Source Reliability</h3>

      {entries.length === 0 ? (
        <p className="pipeline-summary-text">
          런 히스토리가 없어 소스 건강도를 계산할 수 없습니다.
        </p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Source</th>
              <th>Success Rate</th>
              <th>Avg Items</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className={
                  entry.consecutiveFailures >= 3
                    ? "pipeline-stale-source"
                    : undefined
                }
              >
                <td>{entry.id}</td>
                <td>{formatPercent(entry.successRate)}</td>
                <td>{entry.avgYield.toFixed(1)}</td>
                <td>
                  <span
                    className={`pipeline-node-badge ${STATUS_BADGE_CLASS[entry.status]}`}
                  >
                    {STATUS_LABEL[entry.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="pipeline-coming-soon">
        <h4 className="pipeline-coming-soon-title">Content Gap Analysis</h4>
        <p className="pipeline-coming-soon-text">Coming soon</p>
      </div>
    </div>
  );
}
