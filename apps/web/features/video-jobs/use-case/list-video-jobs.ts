import { listVideoJobs as listVideoJobsApi } from "../api/list-video-jobs";

export function listVideoJobs() {
  return listVideoJobsApi();
}
