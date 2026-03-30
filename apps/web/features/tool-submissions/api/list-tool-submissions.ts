import { listToolSubmissions as listToolSubmissionsBackend } from "@vibehub/backend";

export async function listToolSubmissions(options?: { limit?: number }) {
  return listToolSubmissionsBackend(options);
}
