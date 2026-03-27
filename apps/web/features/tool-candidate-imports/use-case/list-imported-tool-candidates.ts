import { listImportedToolCandidates as listImportedToolCandidatesApi } from "../api/list-imported-tool-candidates";

export async function listImportedToolCandidates() {
  return listImportedToolCandidatesApi();
}
