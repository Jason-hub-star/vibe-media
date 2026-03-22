"use server";

import { applyPublishAction } from "@vibehub/backend";
import { revalidatePath } from "next/cache";

type PublishActionInput = {
  targetType: "brief" | "discover";
  targetId: string;
  action: "schedule" | "publish";
};

export async function applyPublishActionAction(
  input: PublishActionInput,
): Promise<{ ok: true } | { error: string }> {
  try {
    await applyPublishAction({
      targetType: input.targetType,
      targetId: input.targetId,
      action: input.action,
    });
    revalidatePath("/admin/publish");
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: message };
  }
}
