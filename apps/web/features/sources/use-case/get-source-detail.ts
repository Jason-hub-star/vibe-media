import { getSourceDetail as getSourceDetailApi } from "../api/get-source-detail";

export async function getSourceDetail(id: string) {
  return getSourceDetailApi(id);
}
