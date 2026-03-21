export type ExceptionTargetType = "brief" | "discover" | "video";

export interface ExceptionQueueItem {
  id: string;
  title: string;
  targetType: ExceptionTargetType;
  currentStage: string;
  reason: string;
  confidence: number;
  sourceLabel: string;
  nextAction: string;
}
