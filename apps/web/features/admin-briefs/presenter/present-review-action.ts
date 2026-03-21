import type { BriefStatus } from "@vibehub/content-contracts";

export function presentReviewAction(status: BriefStatus) {
  if (status === "draft") return "Send to review";
  if (status === "review") return "Schedule";
  if (status === "scheduled") return "Publish";
  return "Live";
}
