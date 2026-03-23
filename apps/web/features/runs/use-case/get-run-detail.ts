import { getRunDetail as getRunDetailApi } from "../api/get-run-detail";

export async function getRunDetail(id: string) {
  return getRunDetailApi(id);
}
