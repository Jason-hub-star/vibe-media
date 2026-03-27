import { getToolCandidateImport as getToolCandidateImportApi } from "../api/get-tool-candidate-import";

export async function getToolCandidateImport(id: string) {
  return getToolCandidateImportApi(id);
}
