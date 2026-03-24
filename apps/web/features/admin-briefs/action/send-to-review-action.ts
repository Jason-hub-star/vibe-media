"use server";

import { sendBriefToReview } from "@vibehub/backend";
import { revalidatePath } from "next/cache";

export async function sendToReviewAction(input: {
  briefSlug: string;
}): Promise<{ ok: true } | { error: string }> {
  try {
    await sendBriefToReview({ briefSlug: input.briefSlug });
    revalidatePath("/admin/briefs");
    revalidatePath("/admin/pending");
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: message };
  }
}
