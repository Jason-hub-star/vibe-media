import { getShowcaseDetail as getShowcaseDetailBackend } from "@vibehub/backend";

export async function getShowcaseDetail(id: string) {
  return getShowcaseDetailBackend(id);
}
