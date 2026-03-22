import { listReviewItems as listReviewItemsBackend } from "@vibehub/backend";

export async function listReviewItems() {
  return listReviewItemsBackend();
}
