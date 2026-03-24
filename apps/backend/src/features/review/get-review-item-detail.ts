import type { ReviewItemDetail } from "@vibehub/content-contracts";

import { listSupabaseBriefs } from "../../shared/supabase-editorial-read";

import { listReviewItems } from "./list-review-items";

export async function getReviewItemDetail(
  id: string,
): Promise<ReviewItemDetail | null> {
  const items = await listReviewItems();
  const item = items.find((i) => i.id === id);
  if (!item) return null;

  const detail: ReviewItemDetail = {
    ...item,
    auditTrail: [],
    modificationReasons: [],
  };

  // Enrich with brief body when targeting brief surface
  if (
    item.targetSurface === "brief" ||
    item.targetSurface === "both"
  ) {
    try {
      const briefs = await listSupabaseBriefs();
      const match = briefs?.find((b) => b.title === item.previewTitle);
      if (match) {
        detail.previewBody = match.body;
      }
    } catch {
      // Fallback: previewBody stays undefined
    }
  }

  return detail;
}
