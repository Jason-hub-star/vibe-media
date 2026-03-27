import type { LiveIngestSnapshot } from "./live-ingest-snapshot";
import { materializeLiveIngestSnapshot, readLiveIngestSnapshot } from "./live-ingest-snapshot";
import { runLiveSourceFetch } from "./live-source-fetch";
import { syncEditorialSnapshotToSupabase } from "./supabase-editorial-sync";
import { toStableUuid } from "./supabase-id";
import { createSupabaseSql, readMigrationSql } from "./supabase-postgres";

function toJsonParam<T extends ReturnType<typeof createSupabaseSql>>(sql: T, value: Record<string, unknown> | string[]) {
  return sql.json(value as Parameters<T["json"]>[0]);
}

async function upsertSources(sql: ReturnType<typeof createSupabaseSql>, snapshot: LiveIngestSnapshot) {
  for (const row of snapshot.tables.sources) {
    await sql`
      insert into public.sources (
        id,
        name,
        kind,
        base_url,
        source_tier,
        pipeline_lane,
        enabled,
        last_success_at,
        last_failure_at,
        failure_reason,
        created_at
      ) values (
        ${toStableUuid(row.id)}::uuid,
        ${row.name},
        ${row.kind},
        ${row.base_url},
        ${row.source_tier},
        ${row.pipeline_lane},
        ${row.enabled},
        ${row.last_success_at}::timestamptz,
        ${row.last_failure_at}::timestamptz,
        ${row.failure_reason},
        ${row.created_at}::timestamptz
      )
      on conflict (id) do update set
        name = excluded.name,
        kind = excluded.kind,
        base_url = excluded.base_url,
        source_tier = excluded.source_tier,
        pipeline_lane = excluded.pipeline_lane,
        enabled = excluded.enabled,
        last_success_at = excluded.last_success_at,
        last_failure_at = excluded.last_failure_at,
        failure_reason = excluded.failure_reason
    `;
  }
}

async function upsertRuns(sql: ReturnType<typeof createSupabaseSql>, snapshot: LiveIngestSnapshot) {
  const validSourceIds = new Set(snapshot.tables.sources.map(s => s.id));
  for (const row of snapshot.tables.ingest_runs) {
    if (!validSourceIds.has(row.source_id)) {
      console.warn(`[sync] skipping orphan run ${row.id}: source_id ${row.source_id} not in snapshot sources`);
      continue;
    }
    await sql`
      insert into public.ingest_runs (
        id,
        source_id,
        run_status,
        started_at,
        finished_at,
        error_message,
        created_at
      ) values (
        ${toStableUuid(row.id)}::uuid,
        ${toStableUuid(row.source_id)}::uuid,
        ${row.run_status},
        ${row.started_at}::timestamptz,
        ${row.finished_at}::timestamptz,
        ${row.error_message},
        ${row.created_at}::timestamptz
      )
      on conflict (id) do update set
        source_id = excluded.source_id,
        run_status = excluded.run_status,
        started_at = excluded.started_at,
        finished_at = excluded.finished_at,
        error_message = excluded.error_message
    `;
  }
}

async function upsertItems(sql: ReturnType<typeof createSupabaseSql>, snapshot: LiveIngestSnapshot) {
  const validSourceIds = new Set(snapshot.tables.sources.map(s => s.id));
  for (const row of snapshot.tables.ingested_items) {
    if (!validSourceIds.has(row.source_id)) {
      console.warn(`[sync] skipping orphan item ${row.id}: source_id ${row.source_id} not in snapshot sources`);
      continue;
    }
    await sql`
      insert into public.ingested_items (
        id,
        source_id,
        run_id,
        title,
        url,
        content_type,
        raw_content,
        parsed_content,
        dedupe_key,
        ingest_status,
        created_at
      ) values (
        ${toStableUuid(row.id)}::uuid,
        ${toStableUuid(row.source_id)}::uuid,
        ${toStableUuid(row.run_id)}::uuid,
        ${row.title},
        ${row.url},
        ${row.content_type},
        ${toJsonParam(sql, row.raw_content)},
        ${toJsonParam(sql, row.parsed_content)},
        ${row.dedupe_key},
        ${row.ingest_status},
        ${row.created_at}::timestamptz
      )
      on conflict (id) do update set
        source_id = excluded.source_id,
        run_id = excluded.run_id,
        title = excluded.title,
        url = excluded.url,
        content_type = excluded.content_type,
        raw_content = excluded.raw_content,
        parsed_content = excluded.parsed_content,
        dedupe_key = excluded.dedupe_key,
        ingest_status = excluded.ingest_status
    `;
  }
}

async function upsertClassifications(sql: ReturnType<typeof createSupabaseSql>, snapshot: LiveIngestSnapshot) {
  // items whose source_id is valid — only these were actually upserted to Supabase
  const validSourceIds = new Set(snapshot.tables.sources.map(s => s.id));
  const validItemIds = new Set(
    snapshot.tables.ingested_items
      .filter(i => validSourceIds.has(i.source_id))
      .map(i => i.id)
  );
  for (const row of snapshot.tables.item_classifications) {
    if (!validItemIds.has(row.item_id)) {
      console.warn(`[sync] skipping orphan classification ${row.id}: item_id ${row.item_id} not in valid items`);
      continue;
    }
    await sql`
      insert into public.item_classifications (
        id,
        item_id,
        category,
        importance_score,
        novelty_score,
        target_surface,
        reason,
        duplicate_of,
        confidence,
        policy_flags,
        exception_reason,
        created_at
      ) values (
        ${toStableUuid(row.id)}::uuid,
        ${toStableUuid(row.item_id)}::uuid,
        ${row.category},
        ${row.importance_score},
        ${row.novelty_score},
        ${row.target_surface},
        ${row.reason},
        ${toStableUuid(row.duplicate_of)}::uuid,
        ${row.confidence},
        ${toJsonParam(sql, row.policy_flags)},
        ${row.exception_reason},
        ${row.created_at}::timestamptz
      )
      on conflict (id) do update set
        item_id = excluded.item_id,
        category = excluded.category,
        importance_score = excluded.importance_score,
        novelty_score = excluded.novelty_score,
        target_surface = excluded.target_surface,
        reason = excluded.reason,
        duplicate_of = excluded.duplicate_of,
        confidence = excluded.confidence,
        policy_flags = excluded.policy_flags,
        exception_reason = excluded.exception_reason
    `;
  }
}

async function upsertRunAttempts(sql: ReturnType<typeof createSupabaseSql>, snapshot: LiveIngestSnapshot) {
  const validSourceIds = new Set(snapshot.tables.sources.map(s => s.id));
  for (const row of snapshot.tables.ingest_runs) {
    if (!validSourceIds.has(row.source_id)) continue;
    const attemptId = toStableUuid(`ingest-run-attempt:${row.id}:1`);
    await sql`
      insert into public.ingest_run_attempts (
        id,
        ingest_run_id,
        target_type,
        target_id,
        attempt_no,
        stage,
        status,
        error_message,
        retryable,
        created_at
      ) values (
        ${attemptId}::uuid,
        ${toStableUuid(row.id)}::uuid,
        'ingest_run',
        ${toStableUuid(row.id)}::uuid,
        1,
        ${row.run_status},
        ${row.run_status === "failed" ? "failed" : "succeeded"},
        ${row.error_message},
        ${row.run_status === "failed"},
        ${row.created_at}::timestamptz
      )
      on conflict (id) do update set
        stage = excluded.stage,
        status = excluded.status,
        error_message = excluded.error_message,
        retryable = excluded.retryable,
        created_at = excluded.created_at
    `;
  }
}

export async function applySupabaseMigrations() {
  const sql = createSupabaseSql();

  try {
    for (const migration of readMigrationSql()) {
      await sql.unsafe(migration.sql);
    }
  } finally {
    await sql.end();
  }
}

export async function syncSnapshotToSupabase(snapshot: LiveIngestSnapshot) {
  const sql = createSupabaseSql();

  try {
    await upsertSources(sql, snapshot);
    await upsertRuns(sql, snapshot);
    await upsertItems(sql, snapshot);
    await upsertClassifications(sql, snapshot);
    await upsertRunAttempts(sql, snapshot);
  } finally {
    await sql.end();
  }

  await syncEditorialSnapshotToSupabase(snapshot);
}

export async function syncLiveIngestToSupabase() {
  const snapshot =
    readLiveIngestSnapshot() ?? materializeLiveIngestSnapshot(await runLiveSourceFetch());

  await syncSnapshotToSupabase(snapshot);

  return snapshot;
}
