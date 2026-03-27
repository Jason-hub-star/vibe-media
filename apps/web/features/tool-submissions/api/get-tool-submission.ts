import { getToolSubmission as getToolSubmissionBackend } from "@vibehub/backend";

export async function getToolSubmission(id: string) {
  return getToolSubmissionBackend(id);
}
