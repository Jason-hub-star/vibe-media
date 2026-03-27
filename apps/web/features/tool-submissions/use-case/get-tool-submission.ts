import { getToolSubmission as getToolSubmissionApi } from "../api/get-tool-submission";

export async function getToolSubmission(id: string) {
  return getToolSubmissionApi(id);
}
