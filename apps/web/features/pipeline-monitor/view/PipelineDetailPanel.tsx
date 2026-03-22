"use client";

import Link from "next/link";
import type { PipelineStage } from "../pipeline-types";
import { STAGE_ADMIN_ROUTES, stageStatusLabel } from "../pipeline-types";

interface PipelineDetailPanelProps {
  stage: PipelineStage;
  onClose: () => void;
}

export function PipelineDetailPanel({ stage, onClose }: PipelineDetailPanelProps) {
  const adminRoute = STAGE_ADMIN_ROUTES[stage.id];
  const badgeClass = `pipeline-badge-${stage.status}`;

  return (
    <aside className="pipeline-detail-panel">
      <div className="pipeline-detail-header">
        <h3 className="pipeline-detail-title">{stage.label}</h3>
        <button
          type="button"
          className="pipeline-detail-close"
          onClick={onClose}
          aria-label="Close detail panel"
        >
          &times;
        </button>
      </div>

      <div className="pipeline-detail-body">
        <div className="pipeline-detail-row">
          <span className="pipeline-detail-label">Status</span>
          <span className={`pipeline-node-badge ${badgeClass}`}>
            {stageStatusLabel(stage.status)}
          </span>
        </div>

        <div className="pipeline-detail-row">
          <span className="pipeline-detail-label">Description</span>
          <span className="pipeline-detail-value">{stage.description}</span>
        </div>

        {stage.itemCount !== undefined && (
          <div className="pipeline-detail-row">
            <span className="pipeline-detail-label">Items</span>
            <span className="pipeline-detail-value">{stage.itemCount}</span>
          </div>
        )}

        {stage.durationMs !== undefined && (
          <div className="pipeline-detail-row">
            <span className="pipeline-detail-label">Duration</span>
            <span className="pipeline-detail-value">
              {stage.durationMs >= 1000
                ? `${(stage.durationMs / 1000).toFixed(1)}s`
                : `${stage.durationMs}ms`}
            </span>
          </div>
        )}

        {stage.errorMessage && (
          <div className="pipeline-detail-row">
            <span className="pipeline-detail-label">Error</span>
            <span className="pipeline-detail-value pipeline-detail-error">
              {stage.errorMessage}
            </span>
          </div>
        )}
      </div>

      {adminRoute && (
        <div className="pipeline-detail-footer">
          <Link href={adminRoute} className="pipeline-detail-link">
            Open {stage.label} queue &rarr;
          </Link>
        </div>
      )}
    </aside>
  );
}
