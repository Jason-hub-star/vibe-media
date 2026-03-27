"use server";

import { revalidatePath } from "next/cache";

import {
  DEFAULT_CANONICAL_LOCALE,
  DEFAULT_TARGET_LOCALES,
} from "@vibehub/content-contracts";
import { promoteToolSubmissionToShowcase, rejectToolSubmission } from "@vibehub/backend";

const SUBMIT_HUB_REVALIDATE_LOCALES = Array.from(
  new Set([DEFAULT_CANONICAL_LOCALE, ...DEFAULT_TARGET_LOCALES]),
);

function revalidateSubmitHubPaths() {
  revalidatePath("/sources");
  for (const locale of SUBMIT_HUB_REVALIDATE_LOCALES) {
    revalidatePath(`/${locale}/sources`);
  }
}

export async function promoteToolSubmissionAction(
  submissionId: string,
): Promise<{ ok: true } | { error: string }> {
  try {
    await promoteToolSubmissionToShowcase(submissionId);
    revalidateSubmitHubPaths();
    revalidatePath("/admin/showcase");
    revalidatePath("/admin/submissions");
    revalidatePath(`/admin/submissions/${submissionId}`);
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function rejectToolSubmissionAction(args: {
  submissionId: string;
  note?: string;
}): Promise<{ ok: true } | { error: string }> {
  try {
    await rejectToolSubmission({
      submissionId: args.submissionId,
      note: args.note ?? null,
    });
    revalidateSubmitHubPaths();
    revalidatePath("/admin/submissions");
    revalidatePath(`/admin/submissions/${args.submissionId}`);
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}
