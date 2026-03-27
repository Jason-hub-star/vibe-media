import { listToolSubmissions as listToolSubmissionsApi } from "../api/list-tool-submissions";

export async function listToolSubmissions() {
  return listToolSubmissionsApi();
}
