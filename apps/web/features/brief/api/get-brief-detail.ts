import { getBriefDetail as getBriefDetailBackend } from "@vibehub/backend";

export async function getBriefDetail(slug: string) {
  return getBriefDetailBackend(slug);
}
