import { listReviewItems as listReviewItemsFromApi } from "../api/list-review-items";

export function listReviewItems() {
  return listReviewItemsFromApi();
}
