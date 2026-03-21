export type PublishQueueStatus = "scheduled" | "upload_ready" | "uploaded_private" | "policy_hold";
export type PublishTargetType = "brief" | "discover" | "video";

export interface PublishQueueItem {
  id: string;
  title: string;
  targetType: PublishTargetType;
  queueStatus: PublishQueueStatus;
  sourceLabel: string;
  scheduledFor: string | null;
  nextAction: string;
}
