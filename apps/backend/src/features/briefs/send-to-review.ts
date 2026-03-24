import { canMoveBriefStatus } from "../../shared/status-rules";
import { createSupabaseSql } from "../../shared/supabase-postgres";

interface BriefRow {
  id: string;
  status: "draft" | "review" | "scheduled" | "published";
}

export async function sendBriefToReview(args: { briefSlug: string }) {
  const sql = createSupabaseSql();

  try {
    const rows = await sql<BriefRow[]>`
      select id, status
      from public.brief_posts
      where slug = ${args.briefSlug}
      limit 1
    `;

    const brief = rows[0];
    if (!brief) {
      throw new Error(`Brief not found for slug "${args.briefSlug}"`);
    }

    if (!canMoveBriefStatus(brief.status, "review")) {
      throw new Error(
        `Brief "${args.briefSlug}" cannot move from ${brief.status} to review`,
      );
    }

    await sql`
      update public.brief_posts
      set
        status = 'review',
        review_status = 'pending'
      where id = ${brief.id}::uuid
    `;

    await sql`
      insert into public.admin_reviews (target_type, target_id, review_status)
      values ('brief', ${brief.id}::uuid, 'pending')
    `;

    return { briefId: brief.id, status: "review" as const };
  } finally {
    await sql.end();
  }
}
