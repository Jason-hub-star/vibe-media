import { getBriefDetail as getBriefDetailApi } from "../api/get-brief-detail";

export async function getBriefDetail(slug: string) {
  return getBriefDetailApi(slug);
}
