"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { PipelineStageStatus } from "../pipeline-types";
import { stageStatusLabel } from "../pipeline-types";

interface PipelineNodeData {
  label: string;
  description: string;
  status: PipelineStageStatus;
  itemCount?: number;
  errorMessage?: string;
  durationMs?: number;
  [key: string]: unknown;
}

const STATUS_ICONS: Record<PipelineStageStatus, string> = {
  idle: "\u25CB",
  running: "\u25C9",
  done: "\u2713",
  error: "\u2715",
};

function PipelineNodeComponent({ data }: NodeProps & { data: PipelineNodeData }) {
  const status = data.status ?? "idle";
  const icon = STATUS_ICONS[status];

  return (
    <div className="pipeline-node" data-status={status}>
      <Handle type="target" position={Position.Left} className="pipeline-handle" />

      <div className="pipeline-node-header">
        <span className="pipeline-node-label">
          <span
            className={`pipeline-status-icon${status === "running" ? " pipeline-status-icon-running" : ""}`}
          >
            {icon}
          </span>
          {data.label}
        </span>
        <span className={`pipeline-node-badge pipeline-badge-${status}`}>
          {stageStatusLabel(status)}
        </span>
      </div>

      <p className="pipeline-node-desc">{data.description}</p>

      {(data.itemCount != null || data.durationMs != null) && (
        <div className="pipeline-node-inline-meta">
          {data.itemCount != null && <span>{data.itemCount}건 처리</span>}
          {data.durationMs != null && <span>{(data.durationMs / 1000).toFixed(1)}초</span>}
        </div>
      )}

      {data.errorMessage && (
        <p className="pipeline-node-error">{data.errorMessage}</p>
      )}

      <Handle type="source" position={Position.Right} className="pipeline-handle" />
    </div>
  );
}

export const PipelineNode = memo(PipelineNodeComponent);
