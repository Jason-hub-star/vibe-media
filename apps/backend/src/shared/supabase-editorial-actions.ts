import type { ReviewStatus, VideoJobStatus } from "@vibehub/content-contracts";

import { canMoveBriefStatus, canMoveVideoJobStatus } from "./status-rules";
import { createSupabaseSql } from "./supabase-postgres";
import { toStableUuid } from "./supabase-id";
import { recordVideoJobAttempt } from "./supabase-video-jobs";

export type ReviewDecision = "approve" | "changes_requested" | "reject";
export type EditorialTargetType = "brief" | "discover";
export type PublishAction = "schedule" | "publish";

interface ReviewRow {
  id: string;
  target_type: "brief" | "discover" | "video";
  target_id: string;
  review_status: ReviewStatus;
}

interface BriefLifecycleRow {
  id: string;
  status: "draft" | "review" | "scheduled" | "published";
  review_status: ReviewStatus;
}

interface DiscoverLifecycleRow {
  id: string;
  review_status: ReviewStatus;
  scheduled_at: string | null;
  published_at: string | null;
}

interface VideoLifecycleRow {
  id: string;
  status: VideoJobStatus;
}

export function resolveReviewStatus(decision: ReviewDecision): ReviewStatus {
  if (decision === "approve") return "approved";
  if (decision === "changes_requested") return "changes_requested";
  return "rejected";
}

export function resolveReviewTimestamp(decision: ReviewDecision, actedAt: string) {
  return decision === "approve" || decision === "reject" ? actedAt : null;
}

export function resolveVideoStatusForReviewDecision(decision: ReviewDecision): VideoJobStatus {
  if (decision === "approve") return "upload_ready";
  if (decision === "changes_requested") return "capcut_pending";
  return "blocked";
}

export async function applySupabaseReviewDecision(args: {
  reviewId: string;
  decision: ReviewDecision;
  note?: string | null;
  actedAt?: string;
}) {
  const sql = createSupabaseSql();
  const actedAt = args.actedAt ?? new Date().toISOString();
  const reviewStatus = resolveReviewStatus(args.decision);

  try {
    const review = await sql<ReviewRow[]>`
      select id, target_type, target_id, review_status
      from public.admin_reviews
      where id = ${toStableUuid(args.reviewId)}::uuid
      limit 1
    `;

    const row = review[0];
    if (!row) {
      throw new Error(`Review row not found for ${args.reviewId}`);
    }

    if (row.target_type === "brief") {
      const briefRows = await sql<BriefLifecycleRow[]>`
        select id, status, review_status
        from public.brief_posts
        where id = ${row.target_id}::uuid
        limit 1
      `;
      const brief = briefRows[0];
      if (!brief) throw new Error(`Brief row not found for review ${args.reviewId}`);

      const nextBriefStatus =
        args.decision === "changes_requested" && canMoveBriefStatus(brief.status, "draft")
          ? "draft"
          : args.decision === "reject" && canMoveBriefStatus(brief.status, "draft")
            ? "draft"
            : brief.status;

      await sql`
        update public.brief_posts
        set
          status = ${nextBriefStatus},
          review_status = ${reviewStatus},
          last_editor_note = ${args.note ?? null}
        where id = ${row.target_id}::uuid
      `;
    } else if (row.target_type === "discover") {
      const discoverRows = await sql<DiscoverLifecycleRow[]>`
        select id, review_status, scheduled_at, published_at
        from public.discover_items
        where id = ${row.target_id}::uuid
        limit 1
      `;
      if (!discoverRows[0]) {
        throw new Error(`Discover row not found for review ${args.reviewId}`);
      }

      await sql`
        update public.discover_items
        set review_status = ${reviewStatus}
        where id = ${row.target_id}::uuid
      `;
    } else {
      const videoRows = await sql<VideoLifecycleRow[]>`
        select id, status
        from public.video_jobs
        where id = ${row.target_id}::uuid
        limit 1
      `;
      const video = videoRows[0];
      if (!video) throw new Error(`Video row not found for review ${args.reviewId}`);

      const nextStatus = resolveVideoStatusForReviewDecision(args.decision);

      if (!canMoveVideoJobStatus(video.status, nextStatus)) {
        throw new Error(`Video job cannot move from ${video.status} to ${nextStatus}`);
      }

      await sql`
        update public.video_jobs
        set
          status = ${nextStatus},
          parent_review_status = ${reviewStatus},
          blocked_reason = ${args.decision === "reject" ? (args.note ?? "review rejected") : null},
          next_action = ${
            args.decision === "approve"
              ? "Move the approved edit into private upload."
              : args.decision === "changes_requested"
                ? "Return to CapCut and address parent review feedback."
                : "Hold the video and resolve the blocked review reason."
          }
        where id = ${row.target_id}::uuid
      `;

      await recordVideoJobAttempt({
        videoJobId: row.target_id,
        stage: nextStatus,
        status: args.decision === "reject" ? "failed" : "succeeded",
        errorMessage: args.decision === "reject" ? (args.note ?? "review rejected") : null,
        retryable: args.decision === "changes_requested",
        createdAt: actedAt
      });
    }

    await sql`
      update public.admin_reviews
      set
        review_status = ${reviewStatus},
        notes = ${args.note ?? null},
        reviewed_at = ${resolveReviewTimestamp(args.decision, actedAt)}::timestamptz
      where id = ${row.id}::uuid
    `;

    return {
      reviewId: row.id,
      targetType: row.target_type,
      targetId: row.target_id,
      reviewStatus
    };
  } finally {
    await sql.end();
  }
}

export async function applySupabasePublishAction(args: {
  targetType: EditorialTargetType;
  targetId: string;
  action: PublishAction;
  scheduledAt?: string | null;
  publishedAt?: string | null;
}) {
  const sql = createSupabaseSql();
  const scheduledAt = args.scheduledAt ?? new Date().toISOString();
  const publishedAt = args.publishedAt ?? new Date().toISOString();

  try {
    if (args.targetType === "brief") {
      const rows = await sql<BriefLifecycleRow[]>`
        select id, status, review_status
        from public.brief_posts
        where id = ${toStableUuid(args.targetId)}::uuid
        limit 1
      `;
      const row = rows[0];
      if (!row) throw new Error(`Brief row not found for ${args.targetId}`);
      if (row.review_status !== "approved") {
        throw new Error(`Brief ${args.targetId} must be approved before publish actions`);
      }

      if (args.action === "schedule") {
        if (!canMoveBriefStatus(row.status, "scheduled")) {
          throw new Error(`Brief ${args.targetId} cannot move from ${row.status} to scheduled`);
        }

        await sql`
          update public.brief_posts
          set
            status = 'scheduled',
            scheduled_at = ${scheduledAt}::timestamptz
          where id = ${row.id}::uuid
        `;
      } else {
        const status = row.status === "published" ? "published" : "published";
        if (row.status !== "scheduled" && row.status !== "published") {
          throw new Error(`Brief ${args.targetId} must be scheduled before publish`);
        }

        await sql`
          update public.brief_posts
          set
            status = ${status},
            published_at = ${publishedAt}::timestamptz
          where id = ${row.id}::uuid
        `;
      }
    } else {
      const rows = await sql<DiscoverLifecycleRow[]>`
        select id, review_status, scheduled_at, published_at
        from public.discover_items
        where id = ${toStableUuid(args.targetId)}::uuid
        limit 1
      `;
      const row = rows[0];
      if (!row) throw new Error(`Discover row not found for ${args.targetId}`);
      if (row.review_status !== "approved") {
        throw new Error(`Discover row ${args.targetId} must be approved before publish actions`);
      }

      if (args.action === "schedule") {
        await sql`
          update public.discover_items
          set scheduled_at = ${scheduledAt}::timestamptz
          where id = ${row.id}::uuid
        `;
      } else {
        if (!row.scheduled_at) {
          throw new Error(`Discover row ${args.targetId} must be scheduled before publish`);
        }

        await sql`
          update public.discover_items
          set published_at = ${publishedAt}::timestamptz
          where id = ${row.id}::uuid
        `;
      }
    }

    return {
      targetType: args.targetType,
      targetId: toStableUuid(args.targetId),
      action: args.action,
      scheduledAt: args.action === "schedule" ? scheduledAt : null,
      publishedAt: args.action === "publish" ? publishedAt : null
    };
  } finally {
    await sql.end();
  }
}
