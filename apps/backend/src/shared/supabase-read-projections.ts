import type {
  ExceptionQueueItem,
  InboxItem,
  IngestRun,
  PublishQueueItem,
  ReviewItem,
  ReviewStatus,
  SourceEntry,
  VideoJobStatus
} from "@vibehub/content-contracts";

import { createSupabaseSql, getSupabaseDbUrl } from "./supabase-postgres";

interface SupabaseSourceRow {
  id: string;
  name: string;
  kind: string;
  base_url: string;
  source_tier: InboxItem["sourceTier"];
}

interface SupabaseRunRow {
  id: string;
  source_name: string;
  run_status: IngestRun["runStatus"];
  started_at: string;
  finished_at: string | null;
  item_count: number;
  error_message: string | null;
}

interface SupabaseItemRow {
  id: string;
  source_name: string;
  source_tier: InboxItem["sourceTier"];
  title: string;
  content_type: InboxItem["contentType"];
  parsed_content: { summary?: unknown };
  ingest_status: "fetched" | "parsed" | "failed";
  target_surface: InboxItem["targetSurface"] | null;
  confidence: string | number | null;
  created_at: string;
}

interface SupabaseReviewRow {
  id: string;
  target_type: "brief" | "discover" | "video";
  target_id: string;
  review_status: ReviewStatus;
  notes: string | null;
  source_item_id: string | null;
  source_name: string | null;
  source_href: string | null;
  source_item_href: string | null;
  preview_title: string;
  preview_summary: string;
  parsed_summary: string | null;
  key_points: string[] | null;
  target_surface: InboxItem["targetSurface"] | null;
  confidence: string | number | null;
}

interface SupabaseEditorialPublishRow {
  id: string;
  title: string;
  source_label: string;
  target_type: "brief" | "discover";
  review_status: ReviewStatus;
  scheduled_at: string | null;
  published_at: string | null;
}

interface SupabaseVideoPublishRow {
  id: string;
  title: string;
  source_session: string;
  status: "upload_ready" | "uploaded_private" | "published";
  next_action: string;
}

interface SupabaseAttemptRow {
  id: string;
  title: string;
  source_label: string;
  target_type: ExceptionQueueItem["targetType"];
  current_stage: ExceptionQueueItem["currentStage"];
  reason: string;
  confidence: string | number | null;
  retryable: boolean;
  next_action: string;
}

interface SupabaseProjectionBundle {
  sourceEntries: SourceEntry[];
  ingestRuns: IngestRun[];
  inboxItems: InboxItem[];
  reviewItems: ReviewItem[];
  publishQueueItems: PublishQueueItem[];
  exceptionQueueItems: ExceptionQueueItem[];
}

const REMOTE_CACHE_TTL_MS = 30_000;

let cachedBundle: SupabaseProjectionBundle | null = null;
let cachedAt = 0;
let inFlightBundle: Promise<SupabaseProjectionBundle | null> | null = null;
let cachedSourceEntries: SourceEntry[] | null = null;
let cachedSourceEntriesAt = 0;
let inFlightSourceEntries: Promise<SourceEntry[] | null> | null = null;

function canReadSupabase() {
  try {
    getSupabaseDbUrl();
    return true;
  } catch {
    return false;
  }
}

function inferSourceCategory(row: Pick<SupabaseSourceRow, "kind" | "name">): SourceEntry["category"] {
  if (row.kind === "github-releases") return "release";
  if (row.name.includes("Research")) return "research";
  return "company";
}

function inferSourceFreshness(row: Pick<SupabaseSourceRow, "kind">): SourceEntry["freshness"] {
  return row.kind === "github-releases" ? "daily" : "weekly";
}

function coerceConfidence(value: string | number | null) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseFloat(value);
  return 0.8;
}

function inferStage(row: Pick<SupabaseItemRow, "target_surface" | "ingest_status">): InboxItem["stage"] {
  if (row.target_surface) return "classified";
  return row.ingest_status === "parsed" ? "parsed" : "classified";
}

function buildReviewItems(rows: SupabaseReviewRow[]) {
  return rows.map(
    (row) =>
      ({
        id: row.id,
        sourceItemId: row.source_item_id ?? row.target_id,
        sourceLabel: row.source_name ?? row.target_type,
        sourceHref: row.source_item_href ?? row.source_href ?? "#",
        sourceExcerpt:
          row.parsed_summary ||
          row.preview_summary ||
          `${row.source_name ?? row.target_type} item is waiting for operator review.`,
        parsedSummary: row.parsed_summary || row.preview_summary,
        keyPoints:
          Array.isArray(row.key_points) && row.key_points.length > 0
            ? row.key_points.slice(0, 3)
            : [row.target_type, row.review_status, row.target_surface ?? "brief"],
        targetSurface: row.target_surface ?? "brief",
        reviewReason: row.notes ?? "operator review required",
        confidence: coerceConfidence(row.confidence),
        previewTitle: row.preview_title,
        previewSummary: row.preview_summary,
        reviewStatus: row.review_status
      }) satisfies ReviewItem
  );
}

function toPublishQueueStatus(row: Pick<SupabaseEditorialPublishRow, "review_status" | "scheduled_at" | "published_at">) {
  if (row.published_at) return "published" as const;
  if (row.scheduled_at) return "scheduled" as const;
  if (row.review_status === "approved") return "approved" as const;
  return "policy_hold" as const;
}

function buildPublishQueueItems(
  editorialRows: SupabaseEditorialPublishRow[],
  videoRows: SupabaseVideoPublishRow[]
) {
  const editorial = editorialRows.map(
    (row) =>
      ({
        id: `publish-${row.target_type}-${row.id}`,
        title: row.title,
        targetType: row.target_type,
        queueStatus: toPublishQueueStatus(row),
        sourceLabel: row.source_label,
        scheduledFor: row.scheduled_at ?? row.published_at,
        nextAction:
          row.published_at
            ? "Published row is recorded. Use this queue as an audit surface only."
            : row.scheduled_at
              ? "Keep the scheduled window unless source fidelity or title changes."
              : row.review_status === "approved"
                ? "Choose the publish window and add final metadata."
                : "Review must approve this item before it can enter the publish window."
      }) satisfies PublishQueueItem
  );

  const videos = videoRows.map(
    (row) =>
      ({
        id: `publish-video-${row.id}`,
        title: row.title,
        targetType: "video",
        queueStatus: row.status === "published" ? "published" : row.status,
        sourceLabel: row.source_session,
        scheduledFor: null,
        nextAction: row.next_action
      }) satisfies PublishQueueItem
  );

  return [...editorial, ...videos];
}

function buildExceptionQueueItems(rows: SupabaseAttemptRow[]) {
  return rows.map(
    (row) =>
      ({
        id: row.id,
        title: row.title,
        targetType: row.target_type,
        currentStage: row.current_stage,
        reason: row.reason,
        confidence: coerceConfidence(row.confidence),
        sourceLabel: row.source_label,
        nextAction: row.next_action,
        retryable: row.retryable
      }) satisfies ExceptionQueueItem
  );
}

export function buildProjectionBundleFromSupabaseRows(
  sourceRows: SupabaseSourceRow[],
  runRows: SupabaseRunRow[],
  itemRows: SupabaseItemRow[],
  reviewRows: SupabaseReviewRow[],
  editorialPublishRows: SupabaseEditorialPublishRow[],
  videoPublishRows: SupabaseVideoPublishRow[],
  attemptRows: SupabaseAttemptRow[]
): SupabaseProjectionBundle {
  const sourceEntries = sourceRows.map((row) => ({
    id: row.id,
    label: row.name,
    category: inferSourceCategory(row),
    href: row.base_url,
    freshness: inferSourceFreshness(row)
  }));

  const ingestRuns = runRows.map((row) => ({
    id: row.id,
    sourceName: row.source_name,
    runStatus: row.run_status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    itemCount: row.item_count,
    errorMessage: row.error_message
  }));

  const inboxItems = itemRows.map((row) => ({
    id: row.id,
    sourceName: row.source_name,
    sourceTier: row.source_tier,
    title: row.title,
    contentType: row.content_type,
    stage: inferStage(row),
    targetSurface: row.target_surface ?? "brief",
    confidence: coerceConfidence(row.confidence),
    parsedSummary: String(row.parsed_content.summary ?? "")
  }));

  return {
    sourceEntries,
    ingestRuns,
    inboxItems,
    reviewItems: buildReviewItems(reviewRows),
    publishQueueItems: buildPublishQueueItems(editorialPublishRows, videoPublishRows),
    exceptionQueueItems: buildExceptionQueueItems(attemptRows)
  };
}

async function fetchProjectionBundleFromSupabase() {
  const sql = createSupabaseSql();

  try {
    const [
      sourceRows,
      runRows,
      itemRows,
      reviewRows,
      editorialPublishRows,
      videoPublishRows,
      attemptRows
    ] = await Promise.all([
      sql<SupabaseSourceRow[]>`
        select id, name, kind, base_url, source_tier
        from public.sources
        where enabled = true
        order by name asc
      `,
      sql<SupabaseRunRow[]>`
        select
          runs.id,
          sources.name as source_name,
          runs.run_status,
          runs.started_at,
          runs.finished_at,
          count(items.id)::int as item_count,
          runs.error_message
        from public.ingest_runs as runs
        join public.sources as sources on sources.id = runs.source_id
        left join public.ingested_items as items on items.run_id = runs.id
        group by runs.id, sources.name, runs.run_status, runs.started_at, runs.finished_at, runs.error_message
        order by runs.started_at desc
      `,
      sql<SupabaseItemRow[]>`
        select
          items.id,
          sources.name as source_name,
          sources.source_tier,
          items.title,
          items.content_type,
          items.parsed_content,
          items.ingest_status,
          classifications.target_surface,
          classifications.confidence,
          items.created_at
        from public.ingested_items as items
        join public.sources as sources on sources.id = items.source_id
        left join public.item_classifications as classifications on classifications.item_id = items.id
        where items.ingest_status != 'drafted'
        order by items.created_at desc
      `,
      sql<SupabaseReviewRow[]>`
        select
          reviews.id,
          reviews.target_type,
          reviews.target_id,
          reviews.review_status,
          reviews.notes,
          coalesce(briefs.source_item_id, discover.source_item_id) as source_item_id,
          sources.name as source_name,
          sources.base_url as source_href,
          items.url as source_item_href,
          coalesce(briefs.title, discover.title, videos.title) as preview_title,
          coalesce(briefs.summary, discover.summary, videos.next_action, '') as preview_summary,
          coalesce(items.parsed_content->>'summary', briefs.summary, discover.summary, videos.next_action) as parsed_summary,
          case
            when jsonb_typeof(items.parsed_content->'tags') = 'array'
              then array(select jsonb_array_elements_text(items.parsed_content->'tags'))
            else null
          end as key_points,
          classifications.target_surface,
          classifications.confidence
        from public.admin_reviews as reviews
        left join public.brief_posts as briefs
          on reviews.target_type = 'brief' and briefs.id = reviews.target_id
        left join public.discover_items as discover
          on reviews.target_type = 'discover' and discover.id = reviews.target_id
        left join public.video_jobs as videos
          on reviews.target_type = 'video' and videos.id = reviews.target_id
        left join public.ingested_items as items
          on items.id = coalesce(briefs.source_item_id, discover.source_item_id)
        left join public.sources as sources
          on sources.id = items.source_id
        left join public.item_classifications as classifications
          on classifications.item_id = items.id
        where reviews.review_status in ('pending', 'changes_requested')
        order by reviews.id asc
      `,
      sql<SupabaseEditorialPublishRow[]>`
        select
          briefs.id,
          briefs.title,
          coalesce(sources.name, 'brief') as source_label,
          'brief'::text as target_type,
          briefs.review_status,
          briefs.scheduled_at,
          briefs.published_at
        from public.brief_posts as briefs
        left join public.ingested_items as items on items.id = briefs.source_item_id
        left join public.sources as sources on sources.id = items.source_id
        where briefs.review_status = 'approved'
           or briefs.scheduled_at is not null
           or briefs.published_at is not null
        union all
        select
          discover.id,
          discover.title,
          coalesce(sources.name, 'discover') as source_label,
          'discover'::text as target_type,
          discover.review_status,
          discover.scheduled_at,
          discover.published_at
        from public.discover_items as discover
        left join public.ingested_items as items on items.id = discover.source_item_id
        left join public.sources as sources on sources.id = items.source_id
        where discover.review_status = 'approved'
           or discover.scheduled_at is not null
           or discover.published_at is not null
      `,
      sql<SupabaseVideoPublishRow[]>`
        select
          id,
          title,
          source_session,
          status,
          next_action
        from public.video_jobs
        where status in ('upload_ready', 'uploaded_private', 'published')
        order by id asc
      `,
      sql<SupabaseAttemptRow[]>`
        select
          concat('exception-run-', attempts.id) as id,
          coalesce(sources.name, runs.id::text) as title,
          coalesce(sources.name, 'ingest') as source_label,
          'discover'::text as target_type,
          coalesce(attempts.stage, 'failed') as current_stage,
          coalesce(attempts.error_message, 'ingest retry required') as reason,
          0.66::numeric as confidence,
          attempts.retryable,
          case
            when attempts.retryable then 'Retry the source fetch or parse step and confirm the latest error diff.'
            else 'Hold this item and investigate the ingest contract before retry.'
          end as next_action
        from public.ingest_run_attempts as attempts
        join public.ingest_runs as runs on runs.id = attempts.ingest_run_id
        left join public.sources as sources on sources.id = runs.source_id
        where attempts.status in ('failed', 'error')
        union all
        select
          concat('exception-video-', jobs.id) as id,
          jobs.title,
          jobs.source_session as source_label,
          'video'::text as target_type,
          jobs.status as current_stage,
          coalesce(jobs.blocked_reason, attempts.error_message, 'video job blocked') as reason,
          1::numeric as confidence,
          coalesce(attempts.retryable, false) as retryable,
          jobs.next_action
        from public.video_jobs as jobs
        left join lateral (
          select a.error_message, a.retryable
          from public.video_job_attempts as a
          where a.video_job_id = jobs.id
          order by a.attempt_no desc, a.created_at desc
          limit 1
        ) as attempts on true
        where jobs.status = 'blocked'
      `
    ]);

    return buildProjectionBundleFromSupabaseRows(
      sourceRows,
      runRows,
      itemRows,
      reviewRows,
      editorialPublishRows,
      videoPublishRows,
      attemptRows
    );
  } finally {
    await sql.end();
  }
}

export async function readSupabaseProjectionBundle() {
  if (!canReadSupabase()) return null;

  const now = Date.now();
  if (cachedBundle && now - cachedAt < REMOTE_CACHE_TTL_MS) {
    return cachedBundle;
  }

  if (inFlightBundle) {
    return inFlightBundle;
  }

  let timerId: ReturnType<typeof setTimeout>;
  const queryTimeout = new Promise<null>((resolve) => {
    timerId = setTimeout(() => resolve(null), 8_000);
  });

  inFlightBundle = Promise.race([
    fetchProjectionBundleFromSupabase()
      .then((bundle) => {
        cachedBundle = bundle;
        cachedAt = Date.now();
        return bundle;
      })
      .catch(() => null),
    queryTimeout
  ]).finally(() => {
    clearTimeout(timerId);
    inFlightBundle = null;
  });

  return inFlightBundle;
}

async function fetchSourceEntriesFromSupabase() {
  const sql = createSupabaseSql();

  try {
    const sourceRows = await sql<SupabaseSourceRow[]>`
      select id, name, kind, base_url, source_tier
      from public.sources
      where enabled = true
      order by name asc
    `;

    return sourceRows.map((row) => ({
      id: row.id,
      label: row.name,
      category: inferSourceCategory(row),
      href: row.base_url,
      freshness: inferSourceFreshness(row)
    })) satisfies SourceEntry[];
  } finally {
    await sql.end();
  }
}

export async function readSupabaseSourceEntries() {
  if (!canReadSupabase()) return null;

  const now = Date.now();
  if (cachedSourceEntries && now - cachedSourceEntriesAt < REMOTE_CACHE_TTL_MS) {
    return cachedSourceEntries;
  }

  if (inFlightSourceEntries) {
    return inFlightSourceEntries;
  }

  let sourceTimerId: ReturnType<typeof setTimeout>;
  const sourceQueryTimeout = new Promise<null>((resolve) => {
    sourceTimerId = setTimeout(() => resolve(null), 15_000);
  });

  inFlightSourceEntries = Promise.race([
    fetchSourceEntriesFromSupabase()
      .then((entries) => {
        cachedSourceEntries = entries;
        cachedSourceEntriesAt = Date.now();
        return entries;
      })
      .catch(() => null),
    sourceQueryTimeout
  ]).finally(() => {
    clearTimeout(sourceTimerId);
    inFlightSourceEntries = null;
  });

  return inFlightSourceEntries;
}
