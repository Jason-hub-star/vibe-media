import type { ReviewItem } from "@vibehub/content-contracts";

import { listReviewItems } from "./list-review-items";

export async function getReviewItemDetail(
  id: string,
): Promise<ReviewItem | null> {
  const items = await listReviewItems();
  return items.find((item) => item.id === id) ?? null;
}
