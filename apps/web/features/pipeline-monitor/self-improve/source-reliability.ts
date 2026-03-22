import type { PipelineRunResult } from "../pipeline-types";

export interface SourceHealthEntry {
  id: string;
  successRate: number;
  avgYield: number;
  status: "healthy" | "degrading" | "failing";
  consecutiveFailures: number;
}

/**
 * Compute health status for each source across pipeline run history.
 *
 * Iterate over runs (newest first), extract fetch-stage source results,
 * and aggregate per-source success rate, average item yield, and
 * consecutive failure count.
 */
export function computeSourceHealth(
  history: PipelineRunResult[],
): SourceHealthEntry[] {
  if (history.length === 0) return [];

  /** Intermediate accumulator keyed by source id. */
  const acc = new Map<
    string,
    { total: number; ok: number; items: number; consecutiveFailures: number }
  >();

  // Process runs from oldest to newest so consecutive-failure tracking
  // reflects the most recent streak.
  const chronological = [...history].sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  for (const run of chronological) {
    const fetchStage = run.stages.find((s) => s.id === "fetch");
    if (!fetchStage?.sources) continue;

    for (const src of fetchStage.sources) {
      let entry = acc.get(src.id);
      if (!entry) {
        entry = { total: 0, ok: 0, items: 0, consecutiveFailures: 0 };
        acc.set(src.id, entry);
      }

      entry.total += 1;
      if (src.ok) {
        entry.ok += 1;
        entry.items += src.items;
        entry.consecutiveFailures = 0;
      } else {
        entry.consecutiveFailures += 1;
      }
    }
  }

  const results: SourceHealthEntry[] = [];

  for (const [id, data] of acc) {
    const successRate = data.total > 0 ? data.ok / data.total : 0;
    const avgYield = data.ok > 0 ? data.items / data.ok : 0;

    let status: SourceHealthEntry["status"];
    if (data.consecutiveFailures >= 3 && avgYield === 0) {
      status = "failing";
    } else if (successRate < 0.7) {
      status = "degrading";
    } else {
      status = "healthy";
    }

    results.push({
      id,
      successRate,
      avgYield,
      status,
      consecutiveFailures: data.consecutiveFailures,
    });
  }

  // Sort: failing first, then degrading, then healthy.
  const statusOrder: Record<string, number> = {
    failing: 0,
    degrading: 1,
    healthy: 2,
  };
  results.sort(
    (a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9),
  );

  return results;
}
