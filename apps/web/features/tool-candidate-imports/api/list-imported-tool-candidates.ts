import { listImportedToolCandidates as listImportedToolCandidatesBackend } from "@vibehub/backend";

export async function listImportedToolCandidates(options?: { limit?: number }) {
  return listImportedToolCandidatesBackend(options);
}
