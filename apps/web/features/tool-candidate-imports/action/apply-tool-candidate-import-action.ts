"use server";

import { revalidatePath } from "next/cache";

import {
  DEFAULT_CANONICAL_LOCALE,
  DEFAULT_TARGET_LOCALES,
} from "@vibehub/content-contracts";
import {
  hideImportedToolCandidate,
  promoteImportedToolCandidateToShowcase,
  rejectImportedToolCandidate,
} from "@vibehub/backend";

const SUBMIT_HUB_REVALIDATE_LOCALES = Array.from(
  new Set([DEFAULT_CANONICAL_LOCALE, ...DEFAULT_TARGET_LOCALES]),
);

function revalidateSubmitHubPaths() {
  revalidatePath("/sources");
  for (const locale of SUBMIT_HUB_REVALIDATE_LOCALES) {
    revalidatePath(`/${locale}/sources`);
  }
}

export async function promoteToolCandidateImportAction(
  candidateId: string,
): Promise<{ ok: true } | { error: string }> {
  try {
    await promoteImportedToolCandidateToShowcase(candidateId);
    revalidateSubmitHubPaths();
    revalidatePath("/admin/showcase");
    revalidatePath("/admin/imported-tools");
    revalidatePath(`/admin/imported-tools/${candidateId}`);
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function rejectToolCandidateImportAction(args: {
  candidateId: string;
  note?: string;
}): Promise<{ ok: true } | { error: string }> {
  try {
    await rejectImportedToolCandidate({
      candidateId: args.candidateId,
      note: args.note ?? null,
    });
    revalidateSubmitHubPaths();
    revalidatePath("/admin/imported-tools");
    revalidatePath(`/admin/imported-tools/${args.candidateId}`);
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function hideToolCandidateImportAction(args: {
  candidateId: string;
  note?: string;
}): Promise<{ ok: true } | { error: string }> {
  try {
    await hideImportedToolCandidate({
      candidateId: args.candidateId,
      note: args.note ?? null,
    });
    revalidateSubmitHubPaths();
    revalidatePath("/admin/imported-tools");
    revalidatePath(`/admin/imported-tools/${args.candidateId}`);
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}
