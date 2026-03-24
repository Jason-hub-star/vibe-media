import type { ReviewStatus } from "@vibehub/content-contracts";

export type BriefWorkflowStatus = "draft" | "review" | "scheduled" | "published";

export interface BriefWorkflowState {
  id: string;
  slug: string;
  status: BriefWorkflowStatus;
  reviewStatus: ReviewStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
}

export interface BriefIntegrityIssue {
  code:
    | "draft-approved"
    | "draft-has-schedule"
    | "draft-has-published-at"
    | "review-has-published-at"
    | "scheduled-has-published-at";
  message: string;
  repairable: boolean;
}

export interface BriefIntegrityRepair {
  status?: BriefWorkflowStatus;
  reviewStatus?: ReviewStatus;
  scheduledAt?: string | null;
  publishedAt?: string | null;
}

export function findBriefIntegrityIssues(state: BriefWorkflowState): BriefIntegrityIssue[] {
  const issues: BriefIntegrityIssue[] = [];

  if (state.status === "draft" && state.reviewStatus === "approved") {
    issues.push({
      code: "draft-approved",
      message: "draft brief must not stay approved",
      repairable: true
    });
  }

  if (state.status === "draft" && state.scheduledAt) {
    issues.push({
      code: "draft-has-schedule",
      message: "draft brief must not retain scheduled_at",
      repairable: true
    });
  }

  if (state.status === "draft" && state.publishedAt) {
    issues.push({
      code: "draft-has-published-at",
      message: "draft brief must not retain published_at",
      repairable: true
    });
  }

  if (state.status === "review" && state.publishedAt) {
    issues.push({
      code: "review-has-published-at",
      message: "review brief already has published_at",
      repairable: false
    });
  }

  if (state.status === "scheduled" && state.publishedAt) {
    issues.push({
      code: "scheduled-has-published-at",
      message: "scheduled brief already has published_at",
      repairable: false
    });
  }

  return issues;
}

export function deriveBriefIntegrityRepair(state: BriefWorkflowState): BriefIntegrityRepair | null {
  const issues = findBriefIntegrityIssues(state).filter((issue) => issue.repairable);
  if (issues.length === 0) return null;

  const repair: BriefIntegrityRepair = {};

  for (const issue of issues) {
    if (issue.code === "draft-approved") {
      repair.reviewStatus = "pending";
    }
    if (issue.code === "draft-has-schedule") {
      repair.scheduledAt = null;
    }
    if (issue.code === "draft-has-published-at") {
      repair.publishedAt = null;
    }
  }

  return repair;
}

export function buildAutoPublishRecoveryNote(failures: string[]) {
  return `auto-publish quality recovery: ${failures.join("; ")}`;
}
