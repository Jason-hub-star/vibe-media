import { listLatestToolSubmissions as listLatestToolSubmissionsBackend } from "@vibehub/backend";

export async function listLatestToolSubmissions() {
  return listLatestToolSubmissionsBackend();
}
