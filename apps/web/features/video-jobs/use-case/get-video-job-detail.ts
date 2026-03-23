import { getVideoJobDetail as getVideoJobDetailApi } from "../api/get-video-job-detail";

export async function getVideoJobDetail(id: string) {
  return getVideoJobDetailApi(id);
}
