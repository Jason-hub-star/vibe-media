import { getReviewItemDetail as getReviewItemDetailApi } from "../api/get-review-item-detail";

export async function getReviewItemDetail(id: string) {
  return getReviewItemDetailApi(id);
}
