import type { BriefStatus } from "./brief";
import type { RunStatus } from "./runs";
import type { VideoJobStatus } from "./video-jobs";

export type ExceptionTargetType = "brief" | "discover" | "video";
export type ExceptionStage = BriefStatus | RunStatus | VideoJobStatus | "policy_hold";

export interface ExceptionQueueItem {
  id: string;
  title: string;
  targetType: ExceptionTargetType;
  currentStage: ExceptionStage;
  reason: string;
  confidence: number;
  sourceLabel: string;
  nextAction: string;
  retryable?: boolean;
}

export interface ExceptionDetail extends ExceptionQueueItem {
  modificationReasons: Array<{ type: string; description: string; severity: "warning" | "error" }>;
  policyViolations: string[];
}
