import type { BriefDetail } from "@vibehub/content-contracts";

import { listSupabaseBriefs } from "../../shared/supabase-editorial-read";

function extractDomains(links: BriefDetail["sourceLinks"]): string[] {
  const seen = new Set<string>();
  for (const link of links) {
    try {
      const host = new URL(link.href).hostname.replace(/^www\./, "");
      seen.add(host);
    } catch {
      // skip malformed URLs
    }
  }
  return [...seen];
}

function wordCount(paragraphs: string[]): number {
  return paragraphs.reduce((n, p) => n + p.split(/\s+/).filter(Boolean).length, 0);
}

function buildPreview(paragraphs: string[], maxLen = 200): string {
  const joined = paragraphs.slice(0, 2).join(" ");
  if (joined.length <= maxLen) return joined;
  return joined.slice(0, maxLen).replace(/\s\S*$/, "") + "…";
}

/** Public: only published briefs */
export async function listBriefs() {
  const remote = await listSupabaseBriefs();

  return (
    remote
      ?.filter((b) => b.status === "published")
      .map(({ body, sourceLinks, ...item }) => ({
        ...item,
        sourceDomains: extractDomains(sourceLinks),
        readTimeMinutes: Math.max(1, Math.ceil(wordCount(body) / 200)),
        bodyPreview: buildPreview(body)
      })) ?? []
  );
}

/** Admin: all briefs regardless of status */
export async function listAllBriefs() {
  const remote = await listSupabaseBriefs();

  return remote?.map(({ body, sourceLinks, ...item }) => item) ?? [];
}
