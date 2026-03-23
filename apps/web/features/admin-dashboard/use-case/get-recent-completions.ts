import type { RecentCompletion } from "@vibehub/content-contracts";
import { listBriefs } from "@/features/admin-briefs/use-case/list-briefs";
import { listDiscoverItems } from "@/features/discover/use-case/list-discover-items";
import { listRuns } from "@/features/runs/use-case/list-runs";

export async function getRecentCompletions(): Promise<RecentCompletion[]> {
  const [briefs, discovers, runs] = await Promise.all([
    listBriefs().catch(() => []),
    listDiscoverItems().catch(() => []),
    listRuns().catch(() => []),
  ]);

  const completions: RecentCompletion[] = [];

  for (const b of briefs) {
    if (b.status === "published" && b.publishedAt) {
      completions.push({
        id: b.slug,
        type: "brief",
        title: b.title,
        completedAt: b.publishedAt,
        publicUrl: `/brief/${b.slug}`,
      });
    }
  }

  for (const d of discovers) {
    if (d.status === "featured") {
      completions.push({
        id: d.id,
        type: "discover",
        title: d.title,
        completedAt: new Date().toISOString(),
        publicUrl: "/radar",
      });
    }
  }

  for (const r of runs) {
    if (r.runStatus === "published" || r.runStatus === "approved") {
      completions.push({
        id: r.id,
        type: "run",
        title: r.sourceName,
        completedAt: r.finishedAt ?? r.startedAt,
        publicUrl: null,
      });
    }
  }

  completions.sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );

  return completions.slice(0, 8);
}
