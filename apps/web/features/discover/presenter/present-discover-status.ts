import type { DiscoverStatus, ReviewStatus } from "@vibehub/content-contracts";

const LABELS: Record<DiscoverStatus, string> = {
  featured: "Featured",
  watching: "Watching",
  tracked: "Tracked"
};

const STYLE: Record<DiscoverStatus, string> = {
  featured: "mint",
  watching: "yellow",
  tracked: "sky"
};

export function presentDiscoverStatus(status: DiscoverStatus) {
  return { label: LABELS[status], style: STYLE[status] };
}

const REVIEW_LABELS: Record<ReviewStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  changes_requested: "Changes Requested",
  rejected: "Rejected"
};

const REVIEW_STYLE: Record<ReviewStatus, string> = {
  pending: "yellow",
  approved: "mint",
  changes_requested: "orange",
  rejected: "red"
};

export function presentReviewStatus(status: ReviewStatus) {
  return { label: REVIEW_LABELS[status], style: REVIEW_STYLE[status] };
}
