/** Dashboard cockpit types for the admin overview. */

export interface RecentCompletion {
  id: string;
  type: "brief" | "discover" | "review" | "video" | "run";
  title: string;
  completedAt: string;
  publicUrl: string | null;
}

export interface DeploymentReadinessItem {
  type: string;
  title: string;
  reason?: string;
  publicUrl?: string;
}

export interface DeploymentReadiness {
  ready: DeploymentReadinessItem[];
  needsReview: DeploymentReadinessItem[];
  blocking: DeploymentReadinessItem[];
}

export interface AutomationTrailEntry {
  runId: string;
  timestamp: string;
  triggerType: "auto" | "manual";
  stagesCompleted: number;
  stagesTotal: number;
  itemsProcessed: number;
  errors: number;
  highlights: string[];
}
