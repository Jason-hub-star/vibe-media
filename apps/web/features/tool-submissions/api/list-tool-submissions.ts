import { listToolSubmissions as listToolSubmissionsBackend } from "@vibehub/backend";

export async function listToolSubmissions() {
  return listToolSubmissionsBackend();
}
