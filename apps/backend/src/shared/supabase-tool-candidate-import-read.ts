import type { ToolCandidateImport } from "@vibehub/content-contracts";

import { createSupabaseSql, getSupabaseDbUrl } from "./supabase-postgres";
import {
  mapToolCandidateImport,
  type ToolCandidateImportRow,
} from "./supabase-tool-candidate-import-records";

const TOOL_CANDIDATE_IMPORTS_CACHE_TTL_MS = 15_000;
const DEFAULT_PUBLIC_TOOL_CANDIDATE_LIMIT = 24;

let cachedAllImports: ToolCandidateImport[] | null = null;
let cachedListingImports: ToolCandidateImport[] | null = null;
let cachedAt = 0;
let inFlight: Promise<ToolCandidateImport[] | null> | null = null;

function canReadSupabase() {
  try {
    getSupabaseDbUrl();
    return true;
  } catch {
    return false;
  }
}

function normalizeListLimit(limit?: number | null) {
  if (typeof limit !== "number" || !Number.isFinite(limit)) return null;
  return Math.max(0, Math.floor(limit));
}

async function queryToolCandidateImportRows(limit?: number | null) {
  const sql = createSupabaseSql();
  const normalizedLimit = normalizeListLimit(limit);

  try {
    if (normalizedLimit === 0) {
      return [] satisfies ToolCandidateImport[];
    }

    if (normalizedLimit !== null) {
      const rows = await sql<ToolCandidateImportRow[]>`
        select
          id,
          slug,
          title,
          summary,
          description,
          website_url,
          github_url,
          demo_url,
          docs_url,
          cover_image_url,
          tags,
          status,
          screening_status,
          screening_score,
          screening_notes,
          source_id,
          source_name_snapshot,
          source_entry_url,
          source_entry_external_id,
          source_locale,
          target_locales,
          first_seen_at,
          last_seen_at,
          imported_at,
          promoted_showcase_entry_id,
          linked_submission_id,
          created_at,
          updated_at
        from public.tool_candidate_imports
        order by imported_at desc, last_seen_at desc, title asc
        limit ${normalizedLimit}
      `;

      return rows.map(mapToolCandidateImport);
    }

    const rows = await sql<ToolCandidateImportRow[]>`
      select
        id,
        slug,
        title,
        summary,
        description,
        website_url,
        github_url,
        demo_url,
        docs_url,
        cover_image_url,
        tags,
        status,
        screening_status,
        screening_score,
        screening_notes,
        source_id,
        source_name_snapshot,
        source_entry_url,
        source_entry_external_id,
        source_locale,
        target_locales,
        first_seen_at,
        last_seen_at,
        imported_at,
        promoted_showcase_entry_id,
        linked_submission_id,
        created_at,
        updated_at
      from public.tool_candidate_imports
      order by imported_at desc, last_seen_at desc, title asc
    `;

    return rows.map(mapToolCandidateImport);
  } finally {
    await sql.end();
  }
}

async function queryListedToolCandidateImports(limit: number) {
  const sql = createSupabaseSql();

  try {
    if (limit === 0) {
      return [] satisfies ToolCandidateImport[];
    }

    const rows = await sql<ToolCandidateImportRow[]>`
      select
        id,
        slug,
        title,
        summary,
        description,
        website_url,
        github_url,
        demo_url,
        docs_url,
        cover_image_url,
        tags,
        status,
        screening_status,
        screening_score,
        screening_notes,
        source_id,
        source_name_snapshot,
        source_entry_url,
        source_entry_external_id,
        source_locale,
        target_locales,
        first_seen_at,
        last_seen_at,
        imported_at,
        promoted_showcase_entry_id,
        linked_submission_id,
        created_at,
        updated_at
      from public.tool_candidate_imports
      where status = 'approved_for_listing'
      order by imported_at desc, last_seen_at desc, title asc
      limit ${limit}
    `;

    return rows.map(mapToolCandidateImport);
  } finally {
    await sql.end();
  }
}

async function queryToolCandidateImportDetail(id: string) {
  const sql = createSupabaseSql();

  try {
    const rows = await sql<ToolCandidateImportRow[]>`
      select
        id,
        slug,
        title,
        summary,
        description,
        website_url,
        github_url,
        demo_url,
        docs_url,
        cover_image_url,
        tags,
        status,
        screening_status,
        screening_score,
        screening_notes,
        source_id,
        source_name_snapshot,
        source_entry_url,
        source_entry_external_id,
        source_locale,
        target_locales,
        first_seen_at,
        last_seen_at,
        imported_at,
        promoted_showcase_entry_id,
        linked_submission_id,
        created_at,
        updated_at
      from public.tool_candidate_imports
      where id = ${id}::uuid
      limit 1
    `;

    return rows[0] ? mapToolCandidateImport(rows[0]) : null;
  } finally {
    await sql.end();
  }
}

async function fetchAllToolCandidateImports() {
  return queryToolCandidateImportRows();
}

async function readAllToolCandidateImports() {
  if (!canReadSupabase()) return null;

  const now = Date.now();
  if (cachedAllImports && now - cachedAt < TOOL_CANDIDATE_IMPORTS_CACHE_TTL_MS) {
    return cachedAllImports;
  }

  if (inFlight) return inFlight;

  inFlight = fetchAllToolCandidateImports()
    .then((rows) => {
      cachedAllImports = rows;
      cachedListingImports = rows.filter((item) => item.status === "approved_for_listing");
      cachedAt = Date.now();
      return rows;
    })
    .catch(() => null)
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

export function invalidateToolCandidateImportCache() {
  cachedAllImports = null;
  cachedListingImports = null;
}

export async function listSupabaseToolCandidateImports(options?: { limit?: number }) {
  if (!canReadSupabase()) return null;

  const limit = normalizeListLimit(options?.limit);
  if (limit !== null) {
    return queryToolCandidateImportRows(limit);
  }

  return readAllToolCandidateImports();
}

export async function listSupabaseImportedToolCandidatesForListing(options?: { limit?: number }) {
  if (!canReadSupabase()) return null;
  const limit =
    normalizeListLimit(options?.limit) ?? DEFAULT_PUBLIC_TOOL_CANDIDATE_LIMIT;

  const now = Date.now();
  if (cachedListingImports && now - cachedAt < TOOL_CANDIDATE_IMPORTS_CACHE_TTL_MS) {
    return cachedListingImports.slice(0, limit);
  }

  return queryListedToolCandidateImports(limit);
}

export async function getSupabaseToolCandidateImportDetail(id: string) {
  const now = Date.now();
  if (cachedAllImports && now - cachedAt < TOOL_CANDIDATE_IMPORTS_CACHE_TTL_MS) {
    return cachedAllImports.find((item) => item.id === id) ?? null;
  }

  return queryToolCandidateImportDetail(id);
}
