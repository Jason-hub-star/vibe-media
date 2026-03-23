import { getShowcaseDetail as getShowcaseDetailApi } from "../api/get-showcase-detail";

export async function getShowcaseDetail(id: string) {
  return getShowcaseDetailApi(id);
}
