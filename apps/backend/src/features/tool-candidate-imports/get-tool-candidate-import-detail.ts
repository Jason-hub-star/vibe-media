import type { ToolCandidateImport } from "@vibehub/content-contracts";

import { getImportedToolCandidateDetail } from "./list-tool-candidate-imports";

export async function getToolCandidateImport(id: string): Promise<ToolCandidateImport | null> {
  return getImportedToolCandidateDetail(id);
}
