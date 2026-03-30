import { createSupabaseSql } from "./supabase-postgres";

const DAY_MS = 24 * 60 * 60 * 1000;
const DELETE_BATCH_SIZE = 500;
const COMPACT_BATCH_SIZE = 200;

export interface SupabaseRetentionPolicy {
  channelPublishResultsDays: number;
  publishDispatchesDays: number;
  ingestRunAttemptsDays: number;
  videoJobAttemptsDays: number;
  ingestRunsDays: number;
  toolSubmissionsDays: number;
  toolCandidateImportsDays: number;
  ingestedItemCompactDays: number;
}

export interface SupabaseRetentionOperation {
  name: string;
  mode: "delete" | "compact";
  days: number;
  cutoff: string;
  affectedRows: number;
}

export interface SupabaseRetentionReport {
  ranAt: string;
  dryRun: boolean;
  policy: SupabaseRetentionPolicy;
  operations: SupabaseRetentionOperation[];
  totalAffectedRows: number;
}

const DEFAULT_RETENTION_POLICY: SupabaseRetentionPolicy = {
  channelPublishResultsDays: 180,
  publishDispatchesDays: 180,
  ingestRunAttemptsDays: 30,
  videoJobAttemptsDays: 45,
  ingestRunsDays: 45,
  toolSubmissionsDays: 120,
  toolCandidateImportsDays: 120,
  ingestedItemCompactDays: 14,
};

function readPositiveIntEnv(
  env: NodeJS.ProcessEnv,
  key: string,
  fallback: number,
) {
  const raw = env[key]?.trim();
  if (!raw) return fallback;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}

function normalizePolicy(
  base: SupabaseRetentionPolicy,
  overrides?: Partial<SupabaseRetentionPolicy>,
): SupabaseRetentionPolicy {
  return {
    channelPublishResultsDays:
      overrides?.channelPublishResultsDays ?? base.channelPublishResultsDays,
    publishDispatchesDays:
      overrides?.publishDispatchesDays ?? base.publishDispatchesDays,
    ingestRunAttemptsDays:
      overrides?.ingestRunAttemptsDays ?? base.ingestRunAttemptsDays,
    videoJobAttemptsDays:
      overrides?.videoJobAttemptsDays ?? base.videoJobAttemptsDays,
    ingestRunsDays: overrides?.ingestRunsDays ?? base.ingestRunsDays,
    toolSubmissionsDays:
      overrides?.toolSubmissionsDays ?? base.toolSubmissionsDays,
    toolCandidateImportsDays:
      overrides?.toolCandidateImportsDays ?? base.toolCandidateImportsDays,
    ingestedItemCompactDays:
      overrides?.ingestedItemCompactDays ?? base.ingestedItemCompactDays,
  };
}

function buildCutoffIso(days: number, ranAt: string) {
  return new Date(new Date(ranAt).getTime() - days * DAY_MS).toISOString();
}

function normalizeCount(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseInt(value, 10) || 0;
  return 0;
}

export function resolveSupabaseRetentionPolicy(
  env: NodeJS.ProcessEnv = process.env,
): SupabaseRetentionPolicy {
  return normalizePolicy(DEFAULT_RETENTION_POLICY, {
    channelPublishResultsDays: readPositiveIntEnv(
      env,
      "SUPABASE_RETENTION_CHANNEL_PUBLISH_DAYS",
      DEFAULT_RETENTION_POLICY.channelPublishResultsDays,
    ),
    publishDispatchesDays: readPositiveIntEnv(
      env,
      "SUPABASE_RETENTION_PUBLISH_DISPATCH_DAYS",
      DEFAULT_RETENTION_POLICY.publishDispatchesDays,
    ),
    ingestRunAttemptsDays: readPositiveIntEnv(
      env,
      "SUPABASE_RETENTION_INGEST_RUN_ATTEMPT_DAYS",
      DEFAULT_RETENTION_POLICY.ingestRunAttemptsDays,
    ),
    videoJobAttemptsDays: readPositiveIntEnv(
      env,
      "SUPABASE_RETENTION_VIDEO_JOB_ATTEMPT_DAYS",
      DEFAULT_RETENTION_POLICY.videoJobAttemptsDays,
    ),
    ingestRunsDays: readPositiveIntEnv(
      env,
      "SUPABASE_RETENTION_INGEST_RUN_DAYS",
      DEFAULT_RETENTION_POLICY.ingestRunsDays,
    ),
    toolSubmissionsDays: readPositiveIntEnv(
      env,
      "SUPABASE_RETENTION_TOOL_SUBMISSION_DAYS",
      DEFAULT_RETENTION_POLICY.toolSubmissionsDays,
    ),
    toolCandidateImportsDays: readPositiveIntEnv(
      env,
      "SUPABASE_RETENTION_TOOL_CANDIDATE_IMPORT_DAYS",
      DEFAULT_RETENTION_POLICY.toolCandidateImportsDays,
    ),
    ingestedItemCompactDays: readPositiveIntEnv(
      env,
      "SUPABASE_RETENTION_INGEST_ITEM_COMPACT_DAYS",
      DEFAULT_RETENTION_POLICY.ingestedItemCompactDays,
    ),
  });
}

async function countChannelPublishResults(
  sql: ReturnType<typeof createSupabaseSql>,
  cutoff: string,
) {
  const rows = await sql<Array<{ count: number }>>`
    select count(*)::int as count
    from public.channel_publish_results
    where created_at < ${cutoff}::timestamptz
  `;

  return normalizeCount(rows[0]?.count);
}

async function deleteChannelPublishResultsBatch(
  sql: ReturnType<typeof createSupabaseSql>,
  cutoff: string,
) {
  const rows = await sql<Array<{ count: number }>>`
    with doomed as (
      select ctid
      from public.channel_publish_results
      where created_at < ${cutoff}::timestamptz
      order by created_at asc
      limit ${DELETE_BATCH_SIZE}
    ),
    deleted as (
      delete from public.channel_publish_results
      where ctid in (select ctid from doomed)
      returning 1
    )
    select count(*)::int as count
    from deleted
  `;

  return normalizeCount(rows[0]?.count);
}

async function countPublishDispatches(
  sql: ReturnType<typeof createSupabaseSql>,
  cutoff: string,
) {
  const rows = await sql<Array<{ count: number }>>`
    select count(*)::int as count
    from public.publish_dispatches
    where created_at < ${cutoff}::timestamptz
  `;

  return normalizeCount(rows[0]?.count);
}

async function deletePublishDispatchesBatch(
  sql: ReturnType<typeof createSupabaseSql>,
  cutoff: string,
) {
  const rows = await sql<Array<{ count: number }>>`
    with doomed as (
      select ctid
      from public.publish_dispatches
      where created_at < ${cutoff}::timestamptz
      order by created_at asc
      limit ${DELETE_BATCH_SIZE}
    ),
    deleted as (
      delete from public.publish_dispatches
      where ctid in (select ctid from doomed)
      returning 1
    )
    select count(*)::int as count
    from deleted
  `;

  return normalizeCount(rows[0]?.count);
}

async function countIngestRunAttempts(
  sql: ReturnType<typeof createSupabaseSql>,
  cutoff: string,
) {
  const rows = await sql<Array<{ count: number }>>`
    select count(*)::int as count
    from public.ingest_run_attempts
    where created_at < ${cutoff}::timestamptz
  `;

  return normalizeCount(rows[0]?.count);
}

async function deleteIngestRunAttemptsBatch(
  sql: ReturnType<typeof createSupabaseSql>,
  cutoff: string,
) {
  const rows = await sql<Array<{ count: number }>>`
    with doomed as (
      select ctid
      from public.ingest_run_attempts
      where created_at < ${cutoff}::timestamptz
      order by created_at asc
      limit ${DELETE_BATCH_SIZE}
    ),
    deleted as (
      delete from public.ingest_run_attempts
      where ctid in (select ctid from doomed)
      returning 1
    )
    select count(*)::int as count
    from deleted
  `;

  return normalizeCount(rows[0]?.count);
}

async function countVideoJobAttempts(
  sql: ReturnType<typeof createSupabaseSql>,
  cutoff: string,
) {
  const rows = await sql<Array<{ count: number }>>`
    select count(*)::int as count
    from public.video_job_attempts
    where created_at < ${cutoff}::timestamptz
  `;

  return normalizeCount(rows[0]?.count);
}

async function deleteVideoJobAttemptsBatch(
  sql: ReturnType<typeof createSupabaseSql>,
  cutoff: string,
) {
  const rows = await sql<Array<{ count: number }>>`
    with doomed as (
      select ctid
      from public.video_job_attempts
      where created_at < ${cutoff}::timestamptz
      order by created_at asc
      limit ${DELETE_BATCH_SIZE}
    ),
    deleted as (
      delete from public.video_job_attempts
      where ctid in (select ctid from doomed)
      returning 1
    )
    select count(*)::int as count
    from deleted
  `;

  return normalizeCount(rows[0]?.count);
}

async function countIngestRuns(
  sql: ReturnType<typeof createSupabaseSql>,
  cutoff: string,
) {
  const rows = await sql<Array<{ count: number }>>`
    select count(*)::int as count
    from public.ingest_runs
    where created_at < ${cutoff}::timestamptz
  `;

  return normalizeCount(rows[0]?.count);
}

async function deleteIngestRunsBatch(
  sql: ReturnType<typeof createSupabaseSql>,
  cutoff: string,
) {
  const rows = await sql<Array<{ count: number }>>`
    with doomed as (
      select ctid
      from public.ingest_runs
      where created_at < ${cutoff}::timestamptz
      order by created_at asc
      limit ${DELETE_BATCH_SIZE}
    ),
    deleted as (
      delete from public.ingest_runs
      where ctid in (select ctid from doomed)
      returning 1
    )
    select count(*)::int as count
    from deleted
  `;

  return normalizeCount(rows[0]?.count);
}

async function countExpiredToolSubmissions(
  sql: ReturnType<typeof createSupabaseSql>,
  cutoff: string,
) {
  const rows = await sql<Array<{ count: number }>>`
    select count(*)::int as count
    from public.tool_submissions
    where updated_at < ${cutoff}::timestamptz
      and status in ('screening_failed', 'rejected', 'spam_blocked')
      and promoted_showcase_entry_id is null
  `;

  return normalizeCount(rows[0]?.count);
}

async function deleteExpiredToolSubmissionsBatch(
  sql: ReturnType<typeof createSupabaseSql>,
  cutoff: string,
) {
  const rows = await sql<Array<{ count: number }>>`
    with doomed as (
      select ctid
      from public.tool_submissions
      where updated_at < ${cutoff}::timestamptz
        and status in ('screening_failed', 'rejected', 'spam_blocked')
        and promoted_showcase_entry_id is null
      order by updated_at asc
      limit ${DELETE_BATCH_SIZE}
    ),
    deleted as (
      delete from public.tool_submissions
      where ctid in (select ctid from doomed)
      returning 1
    )
    select count(*)::int as count
    from deleted
  `;

  return normalizeCount(rows[0]?.count);
}

async function countExpiredToolCandidateImports(
  sql: ReturnType<typeof createSupabaseSql>,
  cutoff: string,
) {
  const rows = await sql<Array<{ count: number }>>`
    select count(*)::int as count
    from public.tool_candidate_imports
    where updated_at < ${cutoff}::timestamptz
      and status in ('hidden_from_listing', 'duplicate_blocked', 'rejected', 'spam_blocked')
      and promoted_showcase_entry_id is null
      and linked_submission_id is null
  `;

  return normalizeCount(rows[0]?.count);
}

async function deleteExpiredToolCandidateImportsBatch(
  sql: ReturnType<typeof createSupabaseSql>,
  cutoff: string,
) {
  const rows = await sql<Array<{ count: number }>>`
    with doomed as (
      select ctid
      from public.tool_candidate_imports
      where updated_at < ${cutoff}::timestamptz
        and status in ('hidden_from_listing', 'duplicate_blocked', 'rejected', 'spam_blocked')
        and promoted_showcase_entry_id is null
        and linked_submission_id is null
      order by updated_at asc
      limit ${DELETE_BATCH_SIZE}
    ),
    deleted as (
      delete from public.tool_candidate_imports
      where ctid in (select ctid from doomed)
      returning 1
    )
    select count(*)::int as count
    from deleted
  `;

  return normalizeCount(rows[0]?.count);
}

async function countCompactableIngestItems(
  sql: ReturnType<typeof createSupabaseSql>,
  cutoff: string,
) {
  const rows = await sql<Array<{ count: number }>>`
    select count(*)::int as count
    from public.ingested_items as items
    join public.item_classifications as classifications
      on classifications.item_id = items.id
    left join public.brief_posts as briefs
      on briefs.source_item_id = items.id
    left join public.discover_items as discover
      on discover.source_item_id = items.id
    where items.created_at < ${cutoff}::timestamptz
      and classifications.target_surface in ('archive', 'discard')
      and briefs.id is null
      and discover.id is null
      and items.parsed_content ? 'contentMarkdown'
      and coalesce(items.parsed_content->>'contentCompacted', 'false') <> 'true'
  `;

  return normalizeCount(rows[0]?.count);
}

async function compactIngestItemsBatch(
  sql: ReturnType<typeof createSupabaseSql>,
  cutoff: string,
  ranAt: string,
) {
  const rows = await sql<Array<{ count: number }>>`
    with doomed as (
      select items.ctid
      from public.ingested_items as items
      join public.item_classifications as classifications
        on classifications.item_id = items.id
      left join public.brief_posts as briefs
        on briefs.source_item_id = items.id
      left join public.discover_items as discover
        on discover.source_item_id = items.id
      where items.created_at < ${cutoff}::timestamptz
        and classifications.target_surface in ('archive', 'discard')
        and briefs.id is null
        and discover.id is null
        and items.parsed_content ? 'contentMarkdown'
        and coalesce(items.parsed_content->>'contentCompacted', 'false') <> 'true'
      order by items.created_at asc
      limit ${COMPACT_BATCH_SIZE}
    ),
    updated as (
      update public.ingested_items as items
      set
        raw_content = jsonb_strip_nulls(
          jsonb_build_object(
            'url', coalesce(items.raw_content->>'url', items.url),
            'publishedAt', items.raw_content->>'publishedAt',
            'sourceId', items.raw_content->>'sourceId',
            'contentCompacted', true,
            'compactedAt', ${ranAt}::timestamptz
          )
        ),
        parsed_content = jsonb_strip_nulls(
          jsonb_build_object(
            'summary', items.parsed_content->>'summary',
            'parserName', items.parsed_content->>'parserName',
            'parseStatus', items.parsed_content->>'parseStatus',
            'imageUrl', items.parsed_content->>'imageUrl',
            'tags', case
              when jsonb_typeof(items.parsed_content->'tags') = 'array'
                then items.parsed_content->'tags'
              else '[]'::jsonb
            end,
            'contentCompacted', true,
            'compactedAt', ${ranAt}::timestamptz
          )
        )
      where items.ctid in (select ctid from doomed)
      returning 1
    )
    select count(*)::int as count
    from updated
  `;

  return normalizeCount(rows[0]?.count);
}

async function executeBatchedOperation(args: {
  dryRun: boolean;
  name: string;
  mode: "delete" | "compact";
  days: number;
  cutoff: string;
  countRows: () => Promise<number>;
  applyBatch: () => Promise<number>;
}): Promise<SupabaseRetentionOperation> {
  if (args.dryRun) {
    return {
      name: args.name,
      mode: args.mode,
      days: args.days,
      cutoff: args.cutoff,
      affectedRows: await args.countRows(),
    };
  }

  let affectedRows = 0;

  while (true) {
    const changed = await args.applyBatch();
    if (changed === 0) break;
    affectedRows += changed;
  }

  return {
    name: args.name,
    mode: args.mode,
    days: args.days,
    cutoff: args.cutoff,
    affectedRows,
  };
}

export async function runSupabaseRetention(args?: {
  dryRun?: boolean;
  policy?: Partial<SupabaseRetentionPolicy>;
}): Promise<SupabaseRetentionReport> {
  const ranAt = new Date().toISOString();
  const policy = normalizePolicy(
    resolveSupabaseRetentionPolicy(),
    args?.policy,
  );
  const dryRun = args?.dryRun ?? false;
  const sql = createSupabaseSql();

  try {
    const operations = [
      await executeBatchedOperation({
        dryRun,
        name: "channel_publish_results",
        mode: "delete",
        days: policy.channelPublishResultsDays,
        cutoff: buildCutoffIso(policy.channelPublishResultsDays, ranAt),
        countRows: () =>
          countChannelPublishResults(
            sql,
            buildCutoffIso(policy.channelPublishResultsDays, ranAt),
          ),
        applyBatch: () =>
          deleteChannelPublishResultsBatch(
            sql,
            buildCutoffIso(policy.channelPublishResultsDays, ranAt),
          ),
      }),
      await executeBatchedOperation({
        dryRun,
        name: "publish_dispatches",
        mode: "delete",
        days: policy.publishDispatchesDays,
        cutoff: buildCutoffIso(policy.publishDispatchesDays, ranAt),
        countRows: () =>
          countPublishDispatches(
            sql,
            buildCutoffIso(policy.publishDispatchesDays, ranAt),
          ),
        applyBatch: () =>
          deletePublishDispatchesBatch(
            sql,
            buildCutoffIso(policy.publishDispatchesDays, ranAt),
          ),
      }),
      await executeBatchedOperation({
        dryRun,
        name: "ingest_run_attempts",
        mode: "delete",
        days: policy.ingestRunAttemptsDays,
        cutoff: buildCutoffIso(policy.ingestRunAttemptsDays, ranAt),
        countRows: () =>
          countIngestRunAttempts(
            sql,
            buildCutoffIso(policy.ingestRunAttemptsDays, ranAt),
          ),
        applyBatch: () =>
          deleteIngestRunAttemptsBatch(
            sql,
            buildCutoffIso(policy.ingestRunAttemptsDays, ranAt),
          ),
      }),
      await executeBatchedOperation({
        dryRun,
        name: "video_job_attempts",
        mode: "delete",
        days: policy.videoJobAttemptsDays,
        cutoff: buildCutoffIso(policy.videoJobAttemptsDays, ranAt),
        countRows: () =>
          countVideoJobAttempts(
            sql,
            buildCutoffIso(policy.videoJobAttemptsDays, ranAt),
          ),
        applyBatch: () =>
          deleteVideoJobAttemptsBatch(
            sql,
            buildCutoffIso(policy.videoJobAttemptsDays, ranAt),
          ),
      }),
      await executeBatchedOperation({
        dryRun,
        name: "ingest_runs",
        mode: "delete",
        days: policy.ingestRunsDays,
        cutoff: buildCutoffIso(policy.ingestRunsDays, ranAt),
        countRows: () =>
          countIngestRuns(sql, buildCutoffIso(policy.ingestRunsDays, ranAt)),
        applyBatch: () =>
          deleteIngestRunsBatch(
            sql,
            buildCutoffIso(policy.ingestRunsDays, ranAt),
          ),
      }),
      await executeBatchedOperation({
        dryRun,
        name: "tool_submissions",
        mode: "delete",
        days: policy.toolSubmissionsDays,
        cutoff: buildCutoffIso(policy.toolSubmissionsDays, ranAt),
        countRows: () =>
          countExpiredToolSubmissions(
            sql,
            buildCutoffIso(policy.toolSubmissionsDays, ranAt),
          ),
        applyBatch: () =>
          deleteExpiredToolSubmissionsBatch(
            sql,
            buildCutoffIso(policy.toolSubmissionsDays, ranAt),
          ),
      }),
      await executeBatchedOperation({
        dryRun,
        name: "tool_candidate_imports",
        mode: "delete",
        days: policy.toolCandidateImportsDays,
        cutoff: buildCutoffIso(policy.toolCandidateImportsDays, ranAt),
        countRows: () =>
          countExpiredToolCandidateImports(
            sql,
            buildCutoffIso(policy.toolCandidateImportsDays, ranAt),
          ),
        applyBatch: () =>
          deleteExpiredToolCandidateImportsBatch(
            sql,
            buildCutoffIso(policy.toolCandidateImportsDays, ranAt),
          ),
      }),
      await executeBatchedOperation({
        dryRun,
        name: "ingested_items_payload_compaction",
        mode: "compact",
        days: policy.ingestedItemCompactDays,
        cutoff: buildCutoffIso(policy.ingestedItemCompactDays, ranAt),
        countRows: () =>
          countCompactableIngestItems(
            sql,
            buildCutoffIso(policy.ingestedItemCompactDays, ranAt),
          ),
        applyBatch: () =>
          compactIngestItemsBatch(
            sql,
            buildCutoffIso(policy.ingestedItemCompactDays, ranAt),
            ranAt,
          ),
      }),
    ];

    return {
      ranAt,
      dryRun,
      policy,
      operations,
      totalAffectedRows: operations.reduce(
        (sum, operation) => sum + operation.affectedRows,
        0,
      ),
    };
  } finally {
    await sql.end();
  }
}
