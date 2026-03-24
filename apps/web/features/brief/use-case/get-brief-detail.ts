import { calcReadTimeMinutes } from "@/features/shared/presenter/present-read-time";

import { getBriefDetail as getBriefDetailApi } from "../api/get-brief-detail";
import { extractSourceDomains } from "../presenter/extract-source-domains";

export async function getBriefDetail(slug: string) {
  const brief = await getBriefDetailApi(slug);
  if (!brief) return null;

  const wordCount = brief.body.join(" ").split(/\s+/).filter(Boolean).length;

  return {
    ...brief,
    readTimeMinutes: brief.readTimeMinutes ?? calcReadTimeMinutes(wordCount),
    sourceDomains: brief.sourceDomains ?? extractSourceDomains(brief.sourceLinks),
  };
}
