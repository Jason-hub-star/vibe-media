import { createSupabaseSql } from "./supabase-postgres";
import { runBriefQualityCheck } from "./brief-quality-check";

const AUTO_APPROVE_MIN_CONFIDENCE = 0.85;
const AUTO_APPROVE_MIN_QUALITY_SCORE = 70;

interface PendingBriefRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string[];
  source_links: { label: string; href: string }[];
  source_count: number;
  source_item_id: string | null;
  confidence: number | null;
  target_surface: string | null;
  duplicate_of: string | null;
  exception_reason: string | null;
  policy_flags: string[] | null;
  source_tier: "auto-safe" | "render-required" | "manual-review-required" | "blocked" | null;
}

interface PublishedBriefRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
}

export interface AutoApproveResult {
  briefId: string;
  slug: string;
  action: "approved" | "held";
  reason?: string;
  qualityScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
}

export interface AutoApproveReport {
  ranAt: string;
  total: number;
  approved: number;
  held: number;
  results: AutoApproveResult[];
}

function normalizeTokens(text: string) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]+/g, " ")
      .split(/\s+/)
      .filter(Boolean)
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

function findDuplicateCandidate(
  brief: Pick<PendingBriefRow, "id" | "title" | "summary">,
  publishedBriefs: PublishedBriefRow[]
) {
  for (const published of publishedBriefs) {
    if (published.id === brief.id) continue;

    const titleSimilarity = jaccardSimilarity(brief.title, published.title);
    const summarySimilarity = jaccardSimilarity(brief.summary, published.summary);

    if (titleSimilarity >= 0.8 || (titleSimilarity >= 0.6 && summarySimilarity >= 0.5)) {
      return {
        slug: published.slug,
        titleSimilarity,
        summarySimilarity
      };
    }
  }

  return null;
}

function formatSimilarity(value: number) {
  return value.toFixed(2);
}

function buildHoldReasons(brief: PendingBriefRow, publishedBriefs: PublishedBriefRow[]) {
  const reasons: string[] = [];
  const quality = runBriefQualityCheck(brief);

  if (!brief.source_item_id) {
    reasons.push("missing source item provenance");
  }

  if (!quality.passed) {
    reasons.push(`quality gate failed: ${quality.failures.join("; ")}`);
  } else if (quality.qualityScore < AUTO_APPROVE_MIN_QUALITY_SCORE) {
    reasons.push(
      `quality score ${quality.qualityScore} below auto-approve threshold ${AUTO_APPROVE_MIN_QUALITY_SCORE}`
    );
  }

  if (brief.target_surface === "both") {
    reasons.push("dual-surface routing requires operator review");
  }

  if (brief.confidence == null) {
    reasons.push("missing classifier confidence");
  } else if (brief.confidence < AUTO_APPROVE_MIN_CONFIDENCE) {
    reasons.push(
      `confidence ${Number(brief.confidence).toFixed(2)} below ${AUTO_APPROVE_MIN_CONFIDENCE.toFixed(2)}`
    );
  }

  if (brief.duplicate_of) {
    reasons.push("classification marked this item as duplicate");
  }

  if (brief.exception_reason) {
    reasons.push(`exception flag: ${brief.exception_reason}`);
  }

  if (brief.source_tier === "manual-review-required" || brief.source_tier === "blocked") {
    reasons.push(`source tier ${brief.source_tier} requires operator review`);
  }

  const policyFlags = brief.policy_flags ?? [];
  if (policyFlags.length > 0) {
    reasons.push(`policy flags present: ${policyFlags.join(", ")}`);
  }

  const duplicateCandidate = findDuplicateCandidate(brief, publishedBriefs);
  if (duplicateCandidate) {
    reasons.push(
      `possible duplicate of ${duplicateCandidate.slug} (title ${formatSimilarity(duplicateCandidate.titleSimilarity)}, summary ${formatSimilarity(duplicateCandidate.summarySimilarity)})`
    );
  }

  return { reasons, quality };
}

function buildAutoApproveHoldNote(reasons: string[]) {
  return `auto-approve hold: ${reasons.join("; ")}`;
}

export async function runAutoApprove(opts: { maxBriefs?: number } = {}): Promise<AutoApproveReport> {
  const sql = createSupabaseSql();
  const ranAt = new Date().toISOString();
  const maxBriefs = opts.maxBriefs ?? 10;

  try {
    const [pendingBriefs, publishedBriefs] = await Promise.all([
      sql<PendingBriefRow[]>`
        select
          briefs.id,
          briefs.slug,
          briefs.title,
          briefs.summary,
          briefs.body,
          briefs.source_links,
          briefs.source_count,
          briefs.source_item_id,
          classifications.confidence,
          classifications.target_surface,
          classifications.duplicate_of,
          classifications.exception_reason,
          classifications.policy_flags,
          sources.source_tier
        from public.brief_posts as briefs
        left join public.item_classifications as classifications
          on classifications.item_id = briefs.source_item_id
        left join public.ingested_items as items
          on items.id = briefs.source_item_id
        left join public.sources as sources
          on sources.id = items.source_id
        where briefs.status = 'review'
          and briefs.review_status = 'pending'
        order by briefs.slug asc
        limit ${maxBriefs}
      `,
      sql<PublishedBriefRow[]>`
        select id, slug, title, summary
        from public.brief_posts
        where published_at is not null
        order by published_at desc, slug asc
        limit 200
      `
    ]);

    const results: AutoApproveResult[] = [];

    for (const brief of pendingBriefs) {
      const { reasons, quality } = buildHoldReasons(brief, publishedBriefs);

      if (reasons.length > 0) {
        const note = buildAutoApproveHoldNote(reasons);

        await sql`
          update public.brief_posts
          set last_editor_note = ${note}
          where id = ${brief.id}::uuid
            and status = 'review'
            and review_status = 'pending'
        `;

        await sql`
          update public.admin_reviews
          set
            notes = ${note},
            reviewed_at = null
          where target_type = 'brief'
            and target_id = ${brief.id}::uuid
            and review_status = 'pending'
        `;

        results.push({
          briefId: brief.id,
          slug: brief.slug,
          action: "held",
          reason: note,
          qualityScore: quality.qualityScore,
          grade: quality.grade
        });
        continue;
      }

      const approvedNote = `auto-approved by review guard (${quality.grade} ${quality.qualityScore})`;

      await sql`
        update public.brief_posts
        set
          review_status = 'approved',
          last_editor_note = ${approvedNote}
        where id = ${brief.id}::uuid
          and status = 'review'
          and review_status = 'pending'
      `;

      await sql`
        update public.admin_reviews
        set
          review_status = 'approved',
          notes = ${approvedNote},
          reviewed_at = ${ranAt}::timestamptz
        where target_type = 'brief'
          and target_id = ${brief.id}::uuid
          and review_status = 'pending'
      `;

      results.push({
        briefId: brief.id,
        slug: brief.slug,
        action: "approved",
        qualityScore: quality.qualityScore,
        grade: quality.grade
      });
    }

    return {
      ranAt,
      total: results.length,
      approved: results.filter((result) => result.action === "approved").length,
      held: results.filter((result) => result.action === "held").length,
      results
    };
  } finally {
    await sql.end();
  }
}
