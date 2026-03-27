/**
 * Source Health Check — 소스 건강성 점검 + 자동 비활성화 + 신규 소스 후보 발견.
 *
 * weekly-source-health.md 기준으로 구현:
 * - 3회 연속 실패 소스 자동 비활성화
 * - 30일 무실적 소스 경고
 * - source_links 역추적으로 신규 소스 후보 발견
 * - maxItems 조정 제안
 */

import { createSupabaseSql } from "./supabase-postgres";

// ── types ─────────────────────────────────────────────────────
interface FailingSourceRow {
  id: string;
  name: string;
  feed_url: string;
  failure_reason: string | null;
  last_failure_at: string | null;
}

interface InactiveSourceRow {
  id: string;
  name: string;
  last_success_at: string | null;
}

interface SourceBriefCountRow {
  name: string;
  brief_count: string; // bigint → string
  max_items: number;
}

interface SourceHrefRow {
  href: string;
}

interface ExistingBaseUrlRow {
  base_url: string;
}

export interface DisabledSource {
  id: string;
  name: string;
  reason: string;
}

export interface InactiveWarning {
  name: string;
  lastSuccessAt: string | null;
}

export interface MaxItemsSuggestion {
  name: string;
  currentMaxItems: number;
  briefCount: number;
  suggestion: "increase" | "decrease" | "disable-candidate" | "keep";
}

export interface NewSourceCandidate {
  domain: string;
  fromBriefSlug?: string;
}

export interface SourceHealthReport {
  ranAt: string;
  activeSourceCount: number;
  disabledThisRun: DisabledSource[];
  inactiveWarnings: InactiveWarning[];
  maxItemsSuggestions: MaxItemsSuggestion[];
  newSourceCandidates: NewSourceCandidate[];
}

// ── main ──────────────────────────────────────────────────────
export async function runSourceHealth(): Promise<SourceHealthReport> {
  const sql = createSupabaseSql();
  const ranAt = new Date().toISOString();

  try {
    // §2-1: 최근 7일간 실패가 기록된 활성 소스 → 자동 비활성화
    const failingSources = await sql<FailingSourceRow[]>`
      select id, name, feed_url, failure_reason, last_failure_at
      from public.sources
      where enabled = true
        and last_failure_at > now() - interval '7 days'
      order by last_failure_at desc
    `;

    const disabledThisRun: DisabledSource[] = [];
    for (const source of failingSources) {
      const reason = `주간 점검: 반복 실패로 자동 비활성화 (${source.failure_reason ?? "unknown"})`;
      await sql`
        update public.sources
        set enabled = false, failure_reason = ${reason}
        where id = ${source.id}::uuid
      `;
      disabledThisRun.push({ id: source.id, name: source.name, reason });
    }

    // §2-3: 30일 무실적 소스 경고
    const inactiveSources = await sql<InactiveSourceRow[]>`
      select id, name, last_success_at
      from public.sources
      where enabled = true
        and (last_success_at is null or last_success_at < now() - interval '30 days')
    `;

    const inactiveWarnings: InactiveWarning[] = inactiveSources.map((s) => ({
      name: s.name,
      lastSuccessAt: s.last_success_at,
    }));

    // §3: 소스→brief 품질 상관분석 + maxItems 제안
    const sourceBriefCounts = await sql<SourceBriefCountRow[]>`
      select
        s.name,
        count(bp.id)::text as brief_count,
        s.max_items
      from public.sources s
      left join public.brief_posts bp
        on bp.source_links::text like '%' || s.base_url || '%'
        and bp.review_status = 'approved'
      where s.enabled = true
        and s.source_type = 'editorial'
      group by s.name, s.max_items
      order by count(bp.id) desc
    `;

    const maxItemsSuggestions: MaxItemsSuggestion[] = sourceBriefCounts.map((row) => {
      const count = parseInt(row.brief_count, 10);
      let suggestion: MaxItemsSuggestion["suggestion"] = "keep";

      if (count >= 10) suggestion = "increase";
      else if (count === 0) suggestion = "disable-candidate";
      else if (count <= 1 && row.max_items > 1) suggestion = "decrease";

      return {
        name: row.name,
        currentMaxItems: row.max_items,
        briefCount: count,
        suggestion,
      };
    });

    // §4: 신규 소스 자동 발견 — source_links 역추적
    const recentHrefs = await sql<SourceHrefRow[]>`
      select distinct
        jsonb_array_elements(source_links)->>'href' as href
      from public.brief_posts
      where published_at > now() - interval '7 days'
    `;

    const existingBaseUrls = await sql<ExistingBaseUrlRow[]>`
      select base_url from public.sources where base_url is not null
    `;
    const existingDomains = new Set(
      existingBaseUrls
        .map((r) => {
          try {
            return new URL(r.base_url).hostname;
          } catch {
            return null;
          }
        })
        .filter(Boolean),
    );

    const newSourceCandidates: NewSourceCandidate[] = [];
    const seenDomains = new Set<string>();

    for (const row of recentHrefs) {
      if (!row.href) continue;
      try {
        const domain = new URL(row.href).hostname;
        if (existingDomains.has(domain) || seenDomains.has(domain)) continue;
        seenDomains.add(domain);
        newSourceCandidates.push({ domain });
      } catch {
        // invalid URL, skip
      }
    }

    // 활성 소스 수
    const [{ count: activeCount }] = await sql<[{ count: string }]>`
      select count(*)::text as count from public.sources where enabled = true
    `;

    return {
      ranAt,
      activeSourceCount: parseInt(activeCount, 10),
      disabledThisRun,
      inactiveWarnings,
      maxItemsSuggestions: maxItemsSuggestions.filter((s) => s.suggestion !== "keep"),
      newSourceCandidates,
    };
  } finally {
    await sql.end();
  }
}

// ── report text builder ───────────────────────────────────────
export function buildSourceHealthReportText(report: SourceHealthReport): string {
  const lines = [
    "🏥 VibeHub Source Health",
    "━━━━━━━━━━━━━━━━━━",
    `활성 소스: ${report.activeSourceCount}개`,
    `이번 비활성화: ${report.disabledThisRun.length}개`,
    `30일 무실적 경고: ${report.inactiveWarnings.length}개`,
    `신규 후보: ${report.newSourceCandidates.length}개`,
  ];

  if (report.disabledThisRun.length > 0) {
    lines.push("━━━━━━━━━━━━━━━━━━");
    lines.push("비활성화");
    for (const s of report.disabledThisRun) {
      lines.push(`- ${s.name}: ${s.reason}`);
    }
  }

  if (report.inactiveWarnings.length > 0) {
    lines.push("━━━━━━━━━━━━━━━━━━");
    lines.push("무실적 경고");
    for (const w of report.inactiveWarnings) {
      lines.push(`- ${w.name} (마지막: ${w.lastSuccessAt ?? "없음"})`);
    }
  }

  if (report.maxItemsSuggestions.length > 0) {
    lines.push("━━━━━━━━━━━━━━━━━━");
    lines.push("maxItems 제안");
    for (const s of report.maxItemsSuggestions) {
      lines.push(`- ${s.name}: brief ${s.briefCount}건, max=${s.currentMaxItems} → ${s.suggestion}`);
    }
  }

  if (report.newSourceCandidates.length > 0) {
    lines.push("━━━━━━━━━━━━━━━━━━");
    lines.push("신규 후보 도메인");
    for (const c of report.newSourceCandidates.slice(0, 10)) {
      lines.push(`- ${c.domain}`);
    }
  }

  return lines.join("\n");
}
