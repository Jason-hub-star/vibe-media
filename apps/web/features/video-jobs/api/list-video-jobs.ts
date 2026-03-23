import { listVideoJobs as listVideoJobsBackend } from "@vibehub/backend";

export async function listVideoJobs() {
  return listVideoJobsBackend();
}
