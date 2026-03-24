import { createSupabaseSql } from "./supabase-postgres";
import { toStableUuid } from "./supabase-id";
import {
  buildAutoPublishRecoveryNote,
  deriveBriefIntegrityRepair,
  findBriefIntegrityIssues,
  type BriefWorkflowState
} from "./editorial-integrity";

interface SupabaseBriefLifecycleRow {
  id: string;
  slug: string;
  status: "draft" | "review" | "scheduled" | "published";
  review_status: "pending" | "approved" | "changes_requested" | "rejected";
  scheduled_at: string | null;
  published_at: string | null;
}

export interface EditorialIntegrityRepairResult {
  scanned: number;
  repaired: number;
  flagged: number;
  results: Array<{
    slug: string;
    repaired: boolean;
    issues: string[];
  }>;
}

function toWorkflowState(row: SupabaseBriefLifecycleRow): BriefWorkflowState {
  return {
    id: row.id,
    slug: row.slug,
    status: row.status,
    reviewStatus: row.review_status,
    scheduledAt: row.scheduled_at,
    publishedAt: row.published_at
  };
}

export async function revertBriefForEditorialRetry(args: {
  briefId: string;
  reason: string;
}) {
  const sql = createSupabaseSql();

  try {
    await sql`
      update public.brief_posts
      set
        status = 'draft',
        review_status = 'pending',
        scheduled_at = null,
        last_editor_note = ${args.reason}
      where id = ${toStableUuid(args.briefId)}::uuid
    `;

    await sql`
      update public.admin_reviews
      set
        review_status = 'pending',
        notes = ${args.reason},
        reviewed_at = null
      where id in (
        select id
        from public.admin_reviews
        where target_type = 'brief'
          and target_id = ${toStableUuid(args.briefId)}::uuid
        order by reviewed_at desc nulls last, id desc
        limit 1
      )
    `;
  } finally {
    await sql.end();
  }
}

export async function repairBriefWorkflowIntegrity() {
  const sql = createSupabaseSql();

  try {
    const rows = await sql<SupabaseBriefLifecycleRow[]>`
      select
        id,
        slug,
        status,
        review_status,
        scheduled_at,
        published_at
      from public.brief_posts
      where (status = 'draft' and (review_status = 'approved' or scheduled_at is not null or published_at is not null))
         or (status = 'review' and published_at is not null)
         or (status = 'scheduled' and published_at is not null)
      order by slug asc
    `;

    const results: EditorialIntegrityRepairResult["results"] = [];
    let repaired = 0;
    let flagged = 0;

    for (const row of rows) {
      const state = toWorkflowState(row);
      const issues = findBriefIntegrityIssues(state);
      const repair = deriveBriefIntegrityRepair(state);

      if (repair) {
        await sql`
          update public.brief_posts
          set
            review_status = coalesce(${repair.reviewStatus ?? null}, review_status),
            scheduled_at = case
              when ${repair.scheduledAt === null} then null
              else scheduled_at
            end,
            published_at = case
              when ${repair.publishedAt === null} then null
              else published_at
            end,
            last_editor_note = ${buildAutoPublishRecoveryNote(issues.map((issue) => issue.message))}
          where id = ${row.id}::uuid
        `;
        repaired += 1;
      } else if (issues.length > 0) {
        flagged += 1;
      }

      results.push({
        slug: row.slug,
        repaired: Boolean(repair),
        issues: issues.map((issue) => issue.message)
      });
    }

    return {
      scanned: rows.length,
      repaired,
      flagged,
      results
    } satisfies EditorialIntegrityRepairResult;
  } finally {
    await sql.end();
  }
}
