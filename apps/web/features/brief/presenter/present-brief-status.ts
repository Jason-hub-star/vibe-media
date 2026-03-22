import type { BriefStatus } from "@vibehub/content-contracts";

export const briefStatusCopy: Record<BriefStatus, string> = {
  draft: "Draft",
  review: "Review",
  scheduled: "Scheduled",
  published: "Published"
};

export const briefStatusPublicCopy: Record<BriefStatus, string> = {
  draft: "준비 중",
  review: "준비 중",
  scheduled: "발행 예정",
  published: "발행됨"
};
