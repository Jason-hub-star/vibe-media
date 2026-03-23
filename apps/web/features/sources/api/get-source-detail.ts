import { getSourceDetail as getSourceDetailBackend } from "@vibehub/backend";

export async function getSourceDetail(id: string) {
  return getSourceDetailBackend(id);
}
