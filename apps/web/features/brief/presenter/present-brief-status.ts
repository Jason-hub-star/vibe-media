import type { BriefStatus } from "@vibehub/content-contracts";

/** Admin 페이지용 (한글) */
export const briefStatusCopy: Record<BriefStatus, string> = {
  draft: "초안",
  review: "검토 중",
  scheduled: "발행 예정",
  published: "발행됨"
};

/** 공개 페이지용 (영어) */
export const briefStatusPublicCopy: Record<BriefStatus, string> = {
  draft: "Coming soon",
  review: "Coming soon",
  scheduled: "Scheduled",
  published: "Published"
};
