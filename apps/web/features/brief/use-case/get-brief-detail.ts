import { calcReadTimeMinutes } from "@/features/shared/presenter/present-read-time";

import { getBriefDetail as getBriefDetailApi } from "../api/get-brief-detail";
import { extractSourceDomains } from "../presenter/extract-source-domains";

export async function getBriefDetail(slug: string) {
  const brief = await getBriefDetailApi(slug);
  if (!brief) return null;

  const wordCount = brief.body.join(" ").split(/\s+/).filter(Boolean).length;
  const bodyElementCount = brief.body.filter((line) => line.trim().length > 0).length;
  const headingCount = brief.body.filter((line) => line.trim().startsWith("## ")).length;

  return {
    ...brief,
    readTimeMinutes: brief.readTimeMinutes ?? calcReadTimeMinutes(wordCount),
    bodyElementCount: brief.bodyElementCount ?? bodyElementCount,
    headingCount: brief.headingCount ?? headingCount,
    sourceDomains: brief.sourceDomains ?? extractSourceDomains(brief.sourceLinks),
  };
}
