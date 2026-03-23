import { listVideoJobs as listVideoJobsApi } from "../api/list-video-jobs";

export async function listVideoJobs() {
  return listVideoJobsApi();
}
