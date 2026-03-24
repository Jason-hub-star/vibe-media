import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import postgres from "postgres";

import "./load-env";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../../..");

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

export function createSupabaseSql() {
  return postgres(getSupabaseDbUrl(), {
    prepare: false,
    max: 10,
    ssl: "require",
    connect_timeout: 10,
    idle_timeout: 20,
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

export function readMigrationSql() {
  const files = [
    "supabase/migrations/20260321130000_initial_media_hub.sql",
    "supabase/migrations/20260322113000_add_ingest_core_tables.sql",
    "supabase/migrations/20260322170000_expand_video_jobs_for_capcut.sql",
    "supabase/migrations/20260322193000_add_editorial_surface_tables.sql",
    "supabase/migrations/20260322213000_expand_editorial_lifecycle_and_retry.sql",
    "supabase/migrations/20260322214000_expand_video_jobs_storage_metadata.sql",
    "supabase/migrations/20260322215000_enable_rls_for_media_tables.sql",
    "supabase/migrations/20260323000000_add_showcase_sidecar_lane.sql"
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
