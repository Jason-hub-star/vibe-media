import { listImportedToolCandidates as listImportedToolCandidatesApi } from "../api/list-imported-tool-candidates";

export async function listImportedToolCandidates(options?: { limit?: number }) {
  return listImportedToolCandidatesApi(options);
}
