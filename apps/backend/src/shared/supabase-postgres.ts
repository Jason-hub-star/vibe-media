import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import postgres from "postgres";

import "./load-env";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../../..");
const SUPABASE_QUERY_RETRY_LIMIT = 3;
const SUPABASE_QUERY_RETRY_DELAY_MS = [500, 1500, 3000];

type SqlClient = ReturnType<typeof postgres>;
type SqlCallable = SqlClient & {
  end: (options?: { timeout?: number }) => Promise<void>;
};

export function getSupabaseDbUrl() {
  const value = process.env.SUPABASE_DB_URL?.trim() || "";

  if (!value) {
    throw new Error("SUPABASE_DB_URL is required");
  }

  if (value.includes("[YOUR-PASSWORD]")) {
    throw new Error("SUPABASE_DB_URL still contains the [YOUR-PASSWORD] placeholder");
  }

  return value;
}

function createRawSupabaseSql(): SqlClient {
  return postgres(getSupabaseDbUrl(), {
    prepare: false,
    max: 10,
    ssl: "require",
    connect_timeout: 10,
    idle_timeout: 60,
    backoff: (attemptNum: number) => Math.min((attemptNum + 1) * 100, 500),
    types: {
      // Return timestamps as ISO strings instead of Date objects.
      // OID 1114 = timestamp, 1184 = timestamptz
      date: {
        to: 1184,
        from: [1082, 1114, 1184],
        serialize: (x: string) => x,
        parse: (x: string) => x,
      },
    },
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableSupabaseError(error: unknown) {
  if (!(error instanceof Error)) return false;

  const message = `${error.message} ${String((error as { routine?: string }).routine ?? "")}`.toLowerCase();
  const code = String((error as { code?: string }).code ?? "");

  if (message.includes("circuit breaker open")) return true;
  if (message.includes("too many authentication errors")) return true;
  if (message.includes("prepared statement")) return true;
  if (code === "CONNECTION_DESTROYED" || message.includes("connection_destroyed")) return true;

  return [
    "08000",
    "08001",
    "08003",
    "08006",
    "57P01",
    "57P02",
    "57P03",
    "53300",
    "42P05",
    "XX000",
  ].includes(code);
}

async function withSqlRetry<T>(
  initialClient: SqlClient,
  setClient: (sql: SqlClient) => void,
  run: (sql: SqlClient) => Promise<T>
) {
  let lastError: unknown;
  let sql = initialClient;

  for (let attempt = 0; attempt <= SUPABASE_QUERY_RETRY_LIMIT; attempt += 1) {
    try {
      return await run(sql);
    } catch (error) {
      lastError = error;
      if (attempt === SUPABASE_QUERY_RETRY_LIMIT || !isRetryableSupabaseError(error)) {
        await sql.end({ timeout: 0 }).catch(() => {});
        throw error;
      }

      await sql.end({ timeout: 0 }).catch(() => {});
      await sleep(SUPABASE_QUERY_RETRY_DELAY_MS[Math.min(attempt, SUPABASE_QUERY_RETRY_DELAY_MS.length - 1)]);
      sql = createRawSupabaseSql();
      setClient(sql);
    }
  }

  throw lastError;
}

function createRetryingSupabaseSql(client: SqlClient): SqlCallable {
  let activeClient = client;

  const proxy = new Proxy(client as SqlCallable, {
    apply(_target, thisArg, args) {
      return withSqlRetry(activeClient, (sql) => {
        activeClient = sql;
      }, async (sql) => {
        return Reflect.apply(sql as never, thisArg, args as never[]);
      });
    },
    get(_target, prop, receiver) {
      if (prop === "end") {
        return async (options?: { timeout?: number }) => {
          const current = activeClient;
          return current.end(options);
        };
      }

      const value = Reflect.get(activeClient as never, prop, receiver);
      if (typeof value !== "function") {
        return value;
      }

      // These helpers return postgres.js Parameter objects (not Promises).
      // Wrapping them in withSqlRetry would cause `await Parameter` → NOT_TAGGED_CALL.
      const parameterHelpers = new Set(["json", "array", "file"]);
      if (parameterHelpers.has(prop as string)) {
        return (...args: never[]) =>
          Reflect.apply((activeClient as never)[prop as never], activeClient, args);
      }

      return (...args: never[]) =>
        withSqlRetry(activeClient, (sql) => {
          activeClient = sql;
        }, async (sql) => {
          return Reflect.apply((sql as never)[prop as never], sql, args);
        });
    },
  });

  return proxy as SqlCallable;
}

export function createSupabaseSql() {
  return createRetryingSupabaseSql(createRawSupabaseSql());
}

export function readMigrationSql() {
  const files = [
    "supabase/migrations/20260321130000_initial_media_hub.sql",
    "supabase/migrations/20260322113000_add_ingest_core_tables.sql",
    "supabase/migrations/20260322170000_expand_video_jobs_for_capcut.sql",
    "supabase/migrations/20260322193000_add_editorial_surface_tables.sql",
    "supabase/migrations/20260322213000_expand_editorial_lifecycle_and_retry.sql",
    "supabase/migrations/20260322214000_expand_video_jobs_storage_metadata.sql",
    "supabase/migrations/20260322215000_enable_rls_for_media_tables.sql",
    "supabase/migrations/20260323000000_add_showcase_sidecar_lane.sql",
    "supabase/migrations/20260324200000_add_brief_cover_image.sql",
    "supabase/migrations/20260326180000_add_channel_publish_results.sql",
    "supabase/migrations/20260327100000_add_locale_variant_tables.sql",
    "supabase/migrations/20260327113000_add_tool_submissions_and_submit_hub.sql",
    "supabase/migrations/20260327143000_add_tool_candidate_imports_and_source_lanes.sql",
    "supabase/migrations/20260327183000_seed_tool_candidate_sources.sql",
    "supabase/migrations/20260327193000_add_brief_youtube_link_fields.sql",
    "supabase/migrations/20260329150000_seed_design_editorial_sources.sql",
  ];

  return files.map((relativePath) => ({
    filePath: relativePath,
    sql: readFileSync(path.join(repoRoot, relativePath), "utf8")
  }));
}

export function readCleanupSql() {
  const relativePath = "supabase/migrations/20260322230000_cleanup_legacy_public_objects.sql";

  return {
    filePath: relativePath,
    sql: readFileSync(path.join(repoRoot, relativePath), "utf8")
  };
}

export { isRetryableSupabaseError };
