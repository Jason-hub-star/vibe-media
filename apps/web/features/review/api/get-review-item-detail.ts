import { getReviewItemDetail as getReviewItemDetailBackend } from "@vibehub/backend";

export async function getReviewItemDetail(id: string) {
  return getReviewItemDetailBackend(id);
}
