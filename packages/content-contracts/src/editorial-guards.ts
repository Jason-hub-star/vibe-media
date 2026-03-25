import type { ReviewStatus } from "./review";

/**
 * 발행 가시성 가드 — brief, discover, showcase 공통.
 * 발행 조건이 변경되면 이 한 곳만 수정하면 된다.
 */
export function isPublished(item: { reviewStatus: ReviewStatus; publishedAt: string | null }): boolean {
  return item.reviewStatus === "approved" && item.publishedAt != null;
}
