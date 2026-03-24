"use server";

import { retryException } from "@vibehub/backend";
import { revalidatePath } from "next/cache";

export async function retryExceptionAction(input: {
  exceptionId: string;
}): Promise<{ ok: true } | { error: string }> {
  try {
    await retryException({ exceptionId: input.exceptionId });
    revalidatePath("/admin/pending");
    revalidatePath("/admin/exceptions");
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: message };
  }
}
