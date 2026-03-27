import { listLatestToolSubmissions as listLatestToolSubmissionsApi } from "../api/list-latest-tool-submissions";

export async function listLatestToolSubmissions() {
  return listLatestToolSubmissionsApi();
}
