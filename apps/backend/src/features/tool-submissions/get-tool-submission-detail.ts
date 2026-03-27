import type { ToolSubmission } from "@vibehub/content-contracts";

import { getToolSubmissionDetail } from "./list-tool-submissions";

export async function getToolSubmission(id: string): Promise<ToolSubmission | null> {
  return getToolSubmissionDetail(id);
}
