import { getBriefDetailAdmin } from "@vibehub/backend";

export async function getBriefDetail(slug: string) {
  return getBriefDetailAdmin(slug);
}
