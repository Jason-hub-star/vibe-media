import type { VideoJob, VideoJobStatus, VideoStorageTier } from "@vibehub/content-contracts";

import { createSupabaseSql, getSupabaseDbUrl } from "./supabase-postgres";
import { toStableUuid } from "./supabase-id";

interface SupabaseVideoJobRow {
  id: string;
  title: string;
  kind: VideoJob["kind"];
  status: VideoJobStatus;
  asset_link_state: VideoJob["assetLinkState"];
  source_session: string;
  transcript_state: VideoJob["transcriptState"];
  highlight_count: number;
  risky_segment_count: number;
  next_action: string;
  private_upload_id: string | null;
  parent_review_status: string | null;
  blocked_reason: string | null;
  raw_file_path: string | null;
  raw_file_size_bytes: number | null;
  raw_sha256: string | null;
  duration_ms: number | null;
  storage_tier: VideoStorageTier;
  proxy_asset_path: string | null;
  preview_asset_path: string | null;
}

export interface UpsertVideoJobInput {
  id: string;
  title: string;
  kind: VideoJob["kind"];
  status: VideoJobStatus;
  assetLinkState: VideoJob["assetLinkState"];
  sourceSession: string;
  transcriptState?: VideoJob["transcriptState"];
  highlightCount?: number;
  riskySegmentCount?: number;
  nextAction: string;
  privateUploadId?: string | null;
  parentReviewStatus?: string | null;
  blockedReason?: string | null;
  rawFilePath?: string | null;
  rawFileSizeBytes?: number | null;
  rawSha256?: string | null;
  durationMs?: number | null;
  storageTier?: VideoStorageTier;
  proxyAssetPath?: string | null;
  previewAssetPath?: string | null;
}

function canReadSupabase() {
  try {
    getSupabaseDbUrl();
    return true;
  } catch {
    return false;
  }
}

function mapRow(row: SupabaseVideoJobRow): VideoJob {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    status: row.status,
    assetLinkState: row.asset_link_state,
    sourceSession: row.source_session,
    transcriptState: row.transcript_state,
    highlightCount: row.highlight_count,
    riskySegmentCount: row.risky_segment_count,
    exceptionReason: row.blocked_reason,
    nextAction: row.next_action,
    rawFilePath: row.raw_file_path,
    rawFileSizeBytes: row.raw_file_size_bytes,
    rawSha256: row.raw_sha256,
    durationMs: row.duration_ms,
    storageTier: row.storage_tier,
    proxyAssetPath: row.proxy_asset_path,
    previewAssetPath: row.preview_asset_path,
    privateUploadId: row.private_upload_id,
    parentReviewStatus: row.parent_review_status,
    blockedReason: row.blocked_reason
  };
}

export async function listSupabaseVideoJobs() {
  if (!canReadSupabase()) return null;
  const sql = createSupabaseSql();

  try {
    const rows = await sql<SupabaseVideoJobRow[]>`
      select
        id,
        title,
        kind,
        status,
        asset_link_state,
        source_session,
        transcript_state,
        highlight_count,
        risky_segment_count,
        next_action,
        private_upload_id,
        parent_review_status,
        blocked_reason,
        raw_file_path,
        raw_file_size_bytes,
        raw_sha256,
        duration_ms,
        storage_tier,
        proxy_asset_path,
        preview_asset_path
      from public.video_jobs
      order by source_session desc, title asc
    `;

    return rows.map(mapRow);
  } finally {
    await sql.end();
  }
}

export async function upsertSupabaseVideoJob(input: UpsertVideoJobInput) {
  const sql = createSupabaseSql();

  try {
    await sql`
      insert into public.video_jobs (
        id,
        title,
        kind,
        status,
        asset_link_state,
        source_session,
        transcript_state,
        highlight_count,
        risky_segment_count,
        next_action,
        private_upload_id,
        parent_review_status,
        blocked_reason,
        raw_file_path,
        raw_file_size_bytes,
        raw_sha256,
        duration_ms,
        storage_tier,
        proxy_asset_path,
        preview_asset_path
      ) values (
        ${toStableUuid(input.id)}::uuid,
        ${input.title},
        ${input.kind},
        ${input.status},
        ${input.assetLinkState},
        ${input.sourceSession},
        ${input.transcriptState ?? "missing"},
        ${input.highlightCount ?? 0},
        ${input.riskySegmentCount ?? 0},
        ${input.nextAction},
        ${input.privateUploadId ?? null},
        ${input.parentReviewStatus ?? null},
        ${input.blockedReason ?? null},
        ${input.rawFilePath ?? null},
        ${input.rawFileSizeBytes ?? null},
        ${input.rawSha256 ?? null},
        ${input.durationMs ?? null},
        ${input.storageTier ?? "local"},
        ${input.proxyAssetPath ?? null},
        ${input.previewAssetPath ?? null}
      )
      on conflict (id) do update set
        title = excluded.title,
        kind = excluded.kind,
        status = excluded.status,
        asset_link_state = excluded.asset_link_state,
        source_session = excluded.source_session,
        transcript_state = excluded.transcript_state,
        highlight_count = excluded.highlight_count,
        risky_segment_count = excluded.risky_segment_count,
        next_action = excluded.next_action,
        private_upload_id = excluded.private_upload_id,
        parent_review_status = excluded.parent_review_status,
        blocked_reason = excluded.blocked_reason,
        raw_file_path = excluded.raw_file_path,
        raw_file_size_bytes = excluded.raw_file_size_bytes,
        raw_sha256 = excluded.raw_sha256,
        duration_ms = excluded.duration_ms,
        storage_tier = excluded.storage_tier,
        proxy_asset_path = excluded.proxy_asset_path,
        preview_asset_path = excluded.preview_asset_path
    `;
  } finally {
    await sql.end();
  }
}

export async function recordVideoJobAttempt(args: {
  videoJobId: string;
  stage: string;
  status: string;
  errorMessage?: string | null;
  retryable?: boolean;
  createdAt?: string;
}) {
  const sql = createSupabaseSql();

  try {
    const nextAttempt = await sql<{ attempt_no: number }[]>`
      select coalesce(max(attempt_no), 0) + 1 as attempt_no
      from public.video_job_attempts
      where video_job_id = ${toStableUuid(args.videoJobId)}::uuid
    `;

    await sql`
      insert into public.video_job_attempts (
        id,
        video_job_id,
        target_type,
        target_id,
        attempt_no,
        stage,
        status,
        error_message,
        retryable,
        created_at
      ) values (
        gen_random_uuid(),
        ${toStableUuid(args.videoJobId)}::uuid,
        'video',
        ${toStableUuid(args.videoJobId)}::uuid,
        ${nextAttempt[0]?.attempt_no ?? 1},
        ${args.stage},
        ${args.status},
        ${args.errorMessage ?? null},
        ${args.retryable ?? false},
        ${args.createdAt ?? new Date().toISOString()}::timestamptz
      )
    `;
  } finally {
    await sql.end();
  }
}
