"use server";

import { applyReviewDecision } from "@vibehub/backend";
import { revalidatePath } from "next/cache";

type ReviewDecisionInput = {
  reviewId: string;
  decision: "approve" | "changes_requested" | "reject";
  note?: string;
};

export async function applyReviewDecisionAction(
  input: ReviewDecisionInput,
): Promise<{ ok: true } | { error: string }> {
  try {
    await applyReviewDecision({
      reviewId: input.reviewId,
      decision: input.decision,
      note: input.note || null,
    });
    revalidatePath("/admin/review");
    revalidatePath("/admin/publish");
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: message };
  }
}
