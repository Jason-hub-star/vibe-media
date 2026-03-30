import { listToolSubmissions as listToolSubmissionsApi } from "../api/list-tool-submissions";

export async function listToolSubmissions(options?: { limit?: number }) {
  return listToolSubmissionsApi(options);
}
