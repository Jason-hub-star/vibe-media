import { createSupabaseSql } from "./supabase-postgres";
import { canMoveBriefStatus } from "./status-rules";
import { toStableUuid } from "./supabase-id";
import { buildAutoPublishRecoveryNote } from "./editorial-integrity";
import { revertBriefForEditorialRetry } from "./supabase-editorial-integrity";

import { runBriefQualityCheck } from "./brief-quality-check";
import type { BriefQualityResult } from "./brief-quality-check";

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
  cover_image_url: string | null;
  status: BriefStatus;
  review_status: string;
}

export interface AutoPublishResult {
  briefId: string;
  slug: string;
  action: "scheduled" | "published" | "skipped";
  skipReason?: string;
  qualityCheck?: BriefQualityResult;
  recoveredForEditorialRetry?: boolean;
}

export interface AutoPublishReport {
  ranAt: string;
  total: number;
  scheduled: number;
  published: number;
  skipped: number;
  results: AutoPublishResult[];
  dailyLimitHit?: boolean;
  alreadyPublishedToday?: number;
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

// ─── Core Worker ──────────────────────────────────────────────────────────────

export async function runAutoPublish(opts: {
  dryRun?: boolean;
  maxBriefs?: number;
  dailyLimit?: number;
}): Promise<AutoPublishReport> {
  const sql = createSupabaseSql();
  const ranAt = new Date().toISOString();
  const maxBriefs = opts.maxBriefs ?? 10;
  const dailyLimit = opts.dailyLimit;

  const results: AutoPublishResult[] = [];
  let alreadyPublishedToday = 0;
  let dailyLimitHit = false;

  try {
    // 0. 오늘 이미 발행된 건수 확인 (dailyLimit 설정 시)
    if (dailyLimit !== undefined) {
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const todayRows = await sql<{ cnt: string }[]>`
        SELECT COUNT(*) AS cnt FROM public.brief_posts
        WHERE status = 'published'
          AND published_at >= ${todayStart.toISOString()}::timestamptz
      `;
      alreadyPublishedToday = parseInt(todayRows[0]?.cnt ?? "0", 10);

      if (alreadyPublishedToday >= dailyLimit) {
        console.log(`[auto-publish] 일일 발행 상한 도달 (${alreadyPublishedToday}/${dailyLimit}건) — 오늘은 더 발행하지 않습니다.`);
        dailyLimitHit = true;
        return { ranAt, total: 0, scheduled: 0, published: 0, skipped: 0, results, dailyLimitHit, alreadyPublishedToday };
      }

      const remaining = dailyLimit - alreadyPublishedToday;
      console.log(`[auto-publish] 오늘 발행 현황: ${alreadyPublishedToday}/${dailyLimit}건 — 남은 슬롯: ${remaining}건`);
    }

    // 1. approved 브리프 조회 — review/scheduled만 (draft 직행 차단)
    //    dailyLimit 설정 시 남은 슬롯 이상은 조회하지 않음
    const effectiveMax = dailyLimit !== undefined
      ? Math.min(maxBriefs, dailyLimit - alreadyPublishedToday)
      : maxBriefs;

    const rows = await sql<BriefRow[]>`
      SELECT
        id, slug, title, summary, body, source_links, source_count, cover_image_url,
        status, review_status
      FROM public.brief_posts
      WHERE review_status = 'approved'
        AND status IN ('review', 'scheduled')
      ORDER BY slug ASC
      LIMIT ${effectiveMax}
    `;

    for (const brief of rows) {
      const qc = runBriefQualityCheck(brief);

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
    results,
    dailyLimitHit,
    alreadyPublishedToday
  };
}
