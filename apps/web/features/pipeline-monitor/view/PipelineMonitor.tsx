"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PipelineNode } from "./PipelineNode";
import { PIPELINE_STAGES, type PipelineStage } from "../pipeline-types";

const nodeTypes = { pipeline: PipelineNode };

const GAP_X = 320;
const START_X = 40;
const NODE_Y = 80;

function buildGraph(stages: PipelineStage[]) {
  const nodes: Node[] = stages.map((stage, i) => ({
    id: stage.id,
    type: "pipeline",
    position: { x: START_X + i * GAP_X, y: NODE_Y },
    data: {
      label: stage.label,
      description: stage.description,
      status: stage.status,
      itemCount: stage.itemCount,
      errorMessage: stage.errorMessage,
      durationMs: stage.durationMs,
    },
    draggable: false,
    selectable: true,
  }));

  const edges: Edge[] = stages.slice(1).map((stage, i) => {
    const prevStatus = stages[i].status;
    const currStatus = stage.status;

    let className = "";
    let animated = false;

    if (currStatus === "running") {
      className = "glow-active";
      animated = true;
    } else if (prevStatus === "done" && currStatus === "done") {
      className = "glow-done";
    }

    return {
      id: `e-${stages[i].id}-${stage.id}`,
      source: stages[i].id,
      target: stage.id,
      className,
      animated,
    };
  });

  return { nodes, edges };
}

interface PipelineMonitorProps {
  stages?: PipelineStage[];
  onRunPipeline?: () => void;
  running?: boolean;
  onNodeSelect?: (stageId: string) => void;
}

export function PipelineMonitor({ stages: externalStages, onRunPipeline, running, onNodeSelect }: PipelineMonitorProps) {
  const stages = externalStages ?? PIPELINE_STAGES;
  const { nodes, edges } = useMemo(() => buildGraph(stages), [stages]);

  const activeStage = stages.find((s) => s.status === "running");
  const doneCount = stages.filter((s) => s.status === "done").length;
  const hasError = stages.some((s) => s.status === "error");

  return (
    <div className="pipeline-monitor">
      <div className="pipeline-monitor-toolbar">
        <div className="pipeline-monitor-status">
          {running && activeStage ? (
            <span className="pipeline-status-running">
              {doneCount}/{stages.length} — {activeStage.label} 실행 중...
            </span>
          ) : hasError ? (
            <span className="pipeline-status-error">파이프라인 오류 발생</span>
          ) : doneCount === stages.length ? (
            <span className="pipeline-status-done">파이프라인 완료</span>
          ) : (
            <span className="pipeline-status-idle">파이프라인 대기</span>
          )}
        </div>
        {onRunPipeline && (
          <button
            type="button"
            className="pipeline-run-btn"
            onClick={onRunPipeline}
            disabled={running}
          >
            {running ? "실행 중..." : "Run Pipeline"}
          </button>
        )}
      </div>

      <div className="pipeline-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
          panOnDrag
          zoomOnScroll
          onNodeClick={(_event, node) => onNodeSelect?.(node.id)}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} color="var(--border)" />
          <Controls
            showInteractive={false}
            className="pipeline-controls"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
