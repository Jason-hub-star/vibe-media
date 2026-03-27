import { getToolCandidateImport as getToolCandidateImportBackend } from "@vibehub/backend";

export async function getToolCandidateImport(id: string) {
  return getToolCandidateImportBackend(id);
}
