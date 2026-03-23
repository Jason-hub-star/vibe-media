import { getVideoJobDetail as getVideoJobDetailBackend } from "@vibehub/backend";

export async function getVideoJobDetail(id: string) {
  return getVideoJobDetailBackend(id);
}
