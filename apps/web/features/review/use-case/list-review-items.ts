import { listReviewItems as listReviewItemsFromApi } from "../api/list-review-items";

export async function listReviewItems() {
  return listReviewItemsFromApi();
}
