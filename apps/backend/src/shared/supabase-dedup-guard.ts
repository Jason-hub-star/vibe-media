/**
 * Dedup Guard — draft/review brief 중복 감지 + [DUPLICATE] 태깅.
 *
 * Jaccard 유사도(title/summary)와 동일 source_links 비교를 수행한다.
 * auto-approve의 jaccardSimilarity와 동일한 알고리즘을 공유한다.
 */

import { createSupabaseSql } from "./supabase-postgres";

// ── thresholds (daily-dedup-guard.md §3 기준) ─────────────────
const TITLE_HIGH_THRESHOLD = 0.8;
const TITLE_LOW_THRESHOLD = 0.6;
const SUMMARY_THRESHOLD = 0.5;

// ── types ─────────────────────────────────────────────────────
interface BriefRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  source_links: string; // jsonb → string
}

export interface DedupMatch {
  newSlug: string;
  existingSlug: string;
  similarity: number;
  type: "title+summary" | "title-only" | "same-source";
}

export interface DedupGuardReport {
  ranAt: string;
  checked: number;
  duplicates: number;
  sameSourceDuplicates: number;
  matches: DedupMatch[];
}

// ── shared jaccard (same algorithm as supabase-auto-approve) ──
function normalizeTokens(text: string) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]+/g, " ")
      .split(/\s+/)
      .filter(Boolean),
  );
}

function jaccardSimilarity(left: string, right: string) {
  const leftTokens = normalizeTokens(left);
  const rightTokens = normalizeTokens(right);

  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) intersection += 1;
  }

  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union === 0 ? 0 : intersection / union;
}

// ── source_links 비교 ─────────────────────────────────────────
function extractHrefs(sourceLinksJson: string): string[] {
  try {
    const links = JSON.parse(sourceLinksJson);
    if (!Array.isArray(links)) return [];
    return links
      .map((l: { href?: string }) => l.href?.trim())
      .filter(Boolean) as string[];
  } catch {
    return [];
  }
}

function hasSameSourceLinks(a: string, b: string): boolean {
  const aHrefs = extractHrefs(a);
  const bHrefs = extractHrefs(b);
  if (aHrefs.length === 0 || bHrefs.length === 0) return false;

  const aSet = new Set(aHrefs);
  return bHrefs.some((href) => aSet.has(href));
}

// ── main ──────────────────────────────────────────────────────
export async function runDedupGuard(): Promise<DedupGuardReport> {
  const sql = createSupabaseSql();
  const ranAt = new Date().toISOString();

  try {
    const [newBriefs, existingBriefs] = await Promise.all([
      sql<BriefRow[]>`
        select id, slug, title, summary, source_links::text as source_links
        from public.brief_posts
        where status in ('draft', 'review')
          and (review_status is null or review_status = 'pending')
        order by slug asc
      `,
      sql<BriefRow[]>`
        select id, slug, title, summary, source_links::text as source_links
        from public.brief_posts
        where review_status = 'approved'
          or published_at is not null
        order by published_at desc nulls last
        limit 50
      `,
    ]);

    const matches: DedupMatch[] = [];

    for (const brief of newBriefs) {
      for (const existing of existingBriefs) {
        if (brief.id === existing.id) continue;

        // 1. 동일 소스 체크 (최우선)
        if (hasSameSourceLinks(brief.source_links, existing.source_links)) {
          matches.push({
            newSlug: brief.slug,
            existingSlug: existing.slug,
            similarity: 1.0,
            type: "same-source",
          });
          break; // 한 brief에 하나의 중복만 기록
        }

        // 2. Jaccard 유사도 체크
        const titleSim = jaccardSimilarity(brief.title, existing.title);
        if (titleSim >= TITLE_HIGH_THRESHOLD) {
          matches.push({
            newSlug: brief.slug,
            existingSlug: existing.slug,
            similarity: titleSim,
            type: "title-only",
          });
          break;
        }

        if (titleSim >= TITLE_LOW_THRESHOLD) {
          const summarySim = jaccardSimilarity(brief.summary, existing.summary);
          if (summarySim >= SUMMARY_THRESHOLD) {
            matches.push({
              newSlug: brief.slug,
              existingSlug: existing.slug,
              similarity: titleSim,
              type: "title+summary",
            });
            break;
          }
        }
      }
    }

    // [DUPLICATE] 태깅 (draft 상태만)
    for (const match of matches) {
      const note = `[DUPLICATE] 기존 brief ${match.existingSlug}과 중복 감지 (${match.type}, ${match.similarity.toFixed(2)})`;
      await sql`
        update public.brief_posts
        set last_editor_note = ${note}
        where slug = ${match.newSlug}
          and status = 'draft'
          and (last_editor_note is null or last_editor_note not like '%[DUPLICATE]%')
      `;
    }

    return {
      ranAt,
      checked: newBriefs.length,
      duplicates: matches.length,
      sameSourceDuplicates: matches.filter((m) => m.type === "same-source").length,
      matches,
    };
  } finally {
    await sql.end();
  }
}

// ── report text builder ───────────────────────────────────────
export function buildDedupReportText(report: DedupGuardReport): string {
  const lines = [
    "🔍 VibeHub Dedup Guard",
    "━━━━━━━━━━━━━━━━━━",
    `검사 대상: ${report.checked}건`,
    `중복 감지: ${report.duplicates}건`,
    `동일 소스: ${report.sameSourceDuplicates}건`,
  ];

  if (report.matches.length > 0) {
    lines.push("━━━━━━━━━━━━━━━━━━");
    for (const match of report.matches) {
      lines.push(
        `- ${match.newSlug} ↔ ${match.existingSlug} (${match.type}, ${match.similarity.toFixed(2)})`,
      );
    }
  }

  return lines.join("\n");
}
