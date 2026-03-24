import { createSupabaseSql } from "./supabase-postgres";
import { canMoveBriefStatus } from "./status-rules";
import { toStableUuid } from "./supabase-id";
import { buildAutoPublishRecoveryNote } from "./editorial-integrity";
import { revertBriefForEditorialRetry } from "./supabase-editorial-integrity";

// ─── Types ────────────────────────────────────────────────────────────────────

type BriefStatus = "draft" | "review" | "scheduled" | "published";

interface BriefRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string[];
  source_links: { label: string; href: string }[];
  source_count: number;
  status: BriefStatus;
  review_status: string;
}

export interface AutoPublishResult {
  briefId: string;
  slug: string;
  action: "scheduled" | "published" | "skipped";
  skipReason?: string;
  qualityCheck?: QualityCheckResult;
  recoveredForEditorialRetry?: boolean;
}

interface QualityCheckResult {
  passed: boolean;
  failures: string[];
  scores: {
    titleLen: number;
    summaryLen: number;
    bodyParagraphs: number;
    sourceCount: number;
  };
}

export interface AutoPublishReport {
  ranAt: string;
  total: number;
  scheduled: number;
  published: number;
  skipped: number;
  results: AutoPublishResult[];
}

async function recoverBriefForEditorialRetry(brief: BriefRow, failures: string[], dryRun?: boolean) {
  const reason = buildAutoPublishRecoveryNote(failures);

  if (!dryRun) {
    await revertBriefForEditorialRetry({
      briefId: brief.id,
      reason
    });
  }

  return reason;
}

// ─── Quality Check ────────────────────────────────────────────────────────────

const INTERNAL_TERMS = ["pipeline", "ingest", "classify", "orchestrat"];

function runQualityCheck(brief: BriefRow): QualityCheckResult {
  const failures: string[] = [];

  const titleLen = brief.title?.length ?? 0;
  const summaryLen = brief.summary?.length ?? 0;
  const bodyParagraphs = (brief.body ?? []).filter(
    (line) => !line.startsWith("## ")
  ).length;
  const sourceCount = brief.source_count ?? (brief.source_links ?? []).length;

  if (titleLen < 15 || titleLen > 70) {
    failures.push(`title length ${titleLen} (expected 15-70)`);
  }
  if (summaryLen < 50 || summaryLen > 200) {
    failures.push(`summary length ${summaryLen} (expected 50-200)`);
  }
  if (bodyParagraphs < 3) {
    failures.push(`body paragraphs ${bodyParagraphs} (expected ≥3)`);
  }
  if (sourceCount < 2) {
    failures.push(`source count ${sourceCount} (expected ≥2)`);
  }

  const bodyText = (brief.body ?? []).join(" ").toLowerCase();
  const foundTerms = INTERNAL_TERMS.filter((t) => bodyText.includes(t));
  if (foundTerms.length > 0) {
    failures.push(`internal terms found: ${foundTerms.join(", ")}`);
  }

  const sourceUrls = (brief.source_links ?? []).map((s) => s.href ?? "");
  const badUrls = sourceUrls.filter((u) => !u.startsWith("https://"));
  if (badUrls.length > 0) {
    failures.push(`non-https source URLs: ${badUrls.join(", ")}`);
  }

  return {
    passed: failures.length === 0,
    failures,
    scores: { titleLen, summaryLen, bodyParagraphs, sourceCount }
  };
}

// ─── Core Worker ──────────────────────────────────────────────────────────────

export async function runAutoPublish(opts: {
  dryRun?: boolean;
  maxBriefs?: number;
}): Promise<AutoPublishReport> {
  const sql = createSupabaseSql();
  const ranAt = new Date().toISOString();
  const maxBriefs = opts.maxBriefs ?? 10;

  const results: AutoPublishResult[] = [];

  try {
    // 1. approved 브리프 조회 — review/scheduled만 (draft 직행 차단)
    const rows = await sql<BriefRow[]>`
      SELECT
        id, slug, title, summary, body, source_links, source_count,
        status, review_status
      FROM public.brief_posts
      WHERE review_status = 'approved'
        AND status IN ('review', 'scheduled')
      ORDER BY slug ASC
      LIMIT ${maxBriefs}
    `;

    for (const brief of rows) {
      const qc = runQualityCheck(brief);

      if (!qc.passed) {
        const recoveredReason = await recoverBriefForEditorialRetry(brief, qc.failures, opts.dryRun);
        results.push({
          briefId: brief.id,
          slug: brief.slug,
          action: "skipped",
          skipReason: `${recoveredReason}; moved back to draft + pending`,
          qualityCheck: qc,
          recoveredForEditorialRetry: true
        });
        continue;
      }

      // 2. status에 따라 다음 단계 결정
      if (brief.status === "scheduled") {
        // scheduled → published (scheduled_at이 현재 시각 이전이어야 함)
        if (!canMoveBriefStatus(brief.status, "published")) {
          results.push({
            briefId: brief.id,
            slug: brief.slug,
            action: "skipped",
            skipReason: `cannot move from ${brief.status} to published`,
            qualityCheck: qc
          });
          continue;
        }

        if (!opts.dryRun) {
          const publishedAt = new Date().toISOString();
          const updated = await sql`
            UPDATE public.brief_posts
            SET status = 'published', published_at = ${publishedAt}::timestamptz
            WHERE id = ${toStableUuid(brief.id)}::uuid
              AND status = 'scheduled'
              AND review_status = 'approved'
              AND (scheduled_at IS NULL OR scheduled_at <= NOW())
          `;
          if (updated.count === 0) {
            results.push({
              briefId: brief.id,
              slug: brief.slug,
              action: "skipped",
              skipReason: "scheduled_at is in the future",
              qualityCheck: qc
            });
            continue;
          }
        }

        results.push({ briefId: brief.id, slug: brief.slug, action: "published", qualityCheck: qc });
      } else if (brief.status === "review") {
        // review → scheduled (draft 직행 차단 — review만 허용)
        if (!canMoveBriefStatus(brief.status, "scheduled")) {
          results.push({
            briefId: brief.id,
            slug: brief.slug,
            action: "skipped",
            skipReason: `cannot move from ${brief.status} to scheduled`,
            qualityCheck: qc
          });
          continue;
        }

        if (!opts.dryRun) {
          const scheduledAt = new Date().toISOString();
          await sql`
            UPDATE public.brief_posts
            SET status = 'scheduled', scheduled_at = ${scheduledAt}::timestamptz
            WHERE id = ${toStableUuid(brief.id)}::uuid
              AND status = 'review'
              AND review_status = 'approved'
          `;
        }

        results.push({ briefId: brief.id, slug: brief.slug, action: "scheduled", qualityCheck: qc });
      } else {
        // draft 등 예상 외 상태 — skip
        results.push({
          briefId: brief.id,
          slug: brief.slug,
          action: "skipped",
          skipReason: `unexpected status '${brief.status}' — only review/scheduled allowed`,
          qualityCheck: qc
        });
      }
    }
  } finally {
    await sql.end();
  }

  return {
    ranAt,
    total: results.length,
    scheduled: results.filter((r) => r.action === "scheduled").length,
    published: results.filter((r) => r.action === "published").length,
    skipped: results.filter((r) => r.action === "skipped").length,
    results
  };
}
