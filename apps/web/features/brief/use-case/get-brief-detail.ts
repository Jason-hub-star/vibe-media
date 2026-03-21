import { getBriefDetail as getBriefDetailApi } from "../api/get-brief-detail";

export function getBriefDetail(slug: string) {
  return getBriefDetailApi(slug);
}
