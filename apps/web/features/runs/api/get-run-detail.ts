import { getRunDetail as getRunDetailBackend } from "@vibehub/backend";

export async function getRunDetail(id: string) {
  return getRunDetailBackend(id);
}
