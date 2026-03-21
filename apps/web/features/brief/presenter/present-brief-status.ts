import type { BriefStatus } from "@vibehub/content-contracts";

export const briefStatusCopy: Record<BriefStatus, string> = {
  draft: "Draft",
  review: "Review",
  scheduled: "Scheduled",
  published: "Published"
};
