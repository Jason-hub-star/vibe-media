import type { ToolCandidateImport } from "@vibehub/content-contracts";

import { createSupabaseSql } from "./supabase-postgres";
import {
  getSupabaseToolCandidateImportDetail,
  invalidateToolCandidateImportCache,
} from "./supabase-tool-candidate-import-read";
import {
  mapToolCandidateImport,
  type ToolCandidateImportRow,
} from "./supabase-tool-candidate-import-records";
import type { SaveShowcaseEntryInput } from "./supabase-showcase-actions";
import { saveSupabaseShowcaseEntry } from "./supabase-showcase-actions";
import type { ScreenedImportedToolCandidate } from "./tool-candidate-import-screening";

export async function upsertSupabaseToolCandidateImports(args: {
  candidates: ScreenedImportedToolCandidate[];
  importedAt?: string;
}) {
  if (!args.candidates.length) {
    return [] satisfies ToolCandidateImport[];
  }

  const sql = createSupabaseSql();

  try {
    const saved: ToolCandidateImport[] = [];

    for (const candidate of args.candidates) {
      const effectiveImportedAt = args.importedAt ?? new Date().toISOString();
      const rows = await sql<ToolCandidateImportRow[]>`
        insert into public.tool_candidate_imports (
          slug,
          title,
          summary,
          description,
          website_url,
          github_url,
          demo_url,
          docs_url,
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
          linked_submission_id
        )
        values (
          ${candidate.slug},
          ${candidate.title},
          ${candidate.summary},
          ${candidate.description},
          ${candidate.websiteUrl},
          ${candidate.githubUrl},
          ${candidate.demoUrl},
          ${candidate.docsUrl},
          ${JSON.stringify(candidate.tags)}::jsonb,
          ${candidate.status},
          ${candidate.screeningStatus},
          ${candidate.screeningScore},
          ${JSON.stringify(candidate.screeningNotes)}::jsonb,
          ${candidate.sourceId}::uuid,
          ${candidate.sourceName},
          ${candidate.sourceEntryUrl},
          ${candidate.sourceEntryExternalId},
          ${candidate.sourceLocale},
          ${JSON.stringify(candidate.targetLocales)}::jsonb,
          ${effectiveImportedAt}::timestamptz,
          ${effectiveImportedAt}::timestamptz,
          ${effectiveImportedAt}::timestamptz,
          ${null}::uuid
        )
        on conflict (source_id, source_entry_url) do update set
          slug = excluded.slug,
          title = excluded.title,
          summary = excluded.summary,
          description = excluded.description,
          website_url = excluded.website_url,
          github_url = excluded.github_url,
          demo_url = excluded.demo_url,
          docs_url = excluded.docs_url,
          tags = excluded.tags,
          status = excluded.status,
          screening_status = excluded.screening_status,
          screening_score = excluded.screening_score,
          screening_notes = excluded.screening_notes,
          source_name_snapshot = excluded.source_name_snapshot,
          source_entry_external_id = excluded.source_entry_external_id,
          source_locale = excluded.source_locale,
          target_locales = excluded.target_locales,
          first_seen_at = least(public.tool_candidate_imports.first_seen_at, excluded.first_seen_at),
          last_seen_at = greatest(public.tool_candidate_imports.last_seen_at, excluded.last_seen_at),
          imported_at = excluded.imported_at,
          updated_at = now()
        returning
          id,
          slug,
          title,
          summary,
          description,
          website_url,
          github_url,
          demo_url,
          docs_url,
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
      `;

      const row = rows[0];
      if (row) {
        saved.push(mapToolCandidateImport(row));
      }
    }

    invalidateToolCandidateImportCache();
    return saved;
  } finally {
    await sql.end();
  }
}

export async function updateSupabaseToolCandidateImportStatus(args: {
  candidateId: string;
  status: ToolCandidateImport["status"];
  screeningStatus?: ToolCandidateImport["screeningStatus"];
  note?: string | null;
}) {
  const sql = createSupabaseSql();

  try {
    const rows = await sql<ToolCandidateImportRow[]>`
      update public.tool_candidate_imports
      set
        status = ${args.status},
        screening_status = coalesce(${args.screeningStatus ?? null}, screening_status),
        screening_notes = case
          when ${args.note ?? null}::text is null then screening_notes
          else screening_notes || jsonb_build_array(${args.note ?? null})
        end,
        updated_at = now()
      where id = ${args.candidateId}::uuid
      returning
        id,
        slug,
        title,
        summary,
        description,
        website_url,
        github_url,
        demo_url,
        docs_url,
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
    `;

    invalidateToolCandidateImportCache();
    return rows[0] ? mapToolCandidateImport(rows[0]) : null;
  } finally {
    await sql.end();
  }
}

function toShowcaseInput(candidate: ToolCandidateImport): SaveShowcaseEntryInput {
  const primaryLink =
    candidate.demoUrl
      ? { kind: "demo" as const, label: "Open demo", href: candidate.demoUrl }
      : candidate.websiteUrl
        ? { kind: "primary" as const, label: "Visit website", href: candidate.websiteUrl }
        : candidate.githubUrl
          ? { kind: "github" as const, label: "GitHub", href: candidate.githubUrl }
          : { kind: "docs" as const, label: "Read docs", href: candidate.docsUrl ?? candidate.sourceEntryUrl };

  const links = [
    candidate.websiteUrl && candidate.websiteUrl !== primaryLink.href
      ? { kind: "primary" as const, label: "Website", href: candidate.websiteUrl }
      : null,
    candidate.githubUrl && candidate.githubUrl !== primaryLink.href
      ? { kind: "github" as const, label: "GitHub", href: candidate.githubUrl }
      : null,
    candidate.demoUrl && candidate.demoUrl !== primaryLink.href
      ? { kind: "demo" as const, label: "Demo", href: candidate.demoUrl }
      : null,
    candidate.docsUrl && candidate.docsUrl !== primaryLink.href
      ? { kind: "docs" as const, label: "Docs", href: candidate.docsUrl }
      : null,
    candidate.sourceEntryUrl !== primaryLink.href
      ? { kind: "brief" as const, label: `Source · ${candidate.sourceName}`, href: candidate.sourceEntryUrl }
      : null,
  ].filter((link): link is NonNullable<typeof link> => Boolean(link));

  return {
    slug: candidate.slug,
    title: candidate.title,
    summary: candidate.summary,
    body: candidate.description
      ? candidate.description.split(/\n+/).map((line) => line.trim()).filter(Boolean)
      : [candidate.summary],
    coverAsset: "/placeholders/source-strip-placeholder.svg",
    tags: [...candidate.tags, "imported"].slice(0, 6),
    primaryLink,
    links,
    reviewStatus: "approved",
    origin: "imported",
    createdBy: "operator",
    submittedBy: null,
    authorLabel: candidate.sourceName,
    featuredHome: false,
    featuredRadar: false,
    featuredSubmitHub: true,
    publishedAt: new Date().toISOString(),
  };
}

export async function promoteSupabaseToolCandidateImportToShowcase(candidateId: string) {
  const candidate = await getSupabaseToolCandidateImportDetail(candidateId);
  if (!candidate) {
    throw new Error("Imported candidate not found.");
  }

  if (candidate.promotedShowcaseEntryId) {
    return {
      candidate,
      showcaseEntryId: candidate.promotedShowcaseEntryId,
    };
  }

  if (candidate.status !== "approved_for_listing") {
    throw new Error("Only approved imported candidates can be promoted to showcase.");
  }

  const showcase = await saveSupabaseShowcaseEntry(toShowcaseInput(candidate));
  await updateSupabaseToolCandidateImportStatus({
    candidateId,
    status: "promoted_to_showcase",
    screeningStatus: "passed",
    note: `Promoted to showcase (${showcase.id}).`,
  });

  const sql = createSupabaseSql();
  try {
    await sql`
      update public.tool_candidate_imports
      set promoted_showcase_entry_id = ${showcase.id}::uuid,
          updated_at = now()
      where id = ${candidateId}::uuid
    `;
  } finally {
    await sql.end();
  }

  invalidateToolCandidateImportCache();

  return {
    candidate: await getSupabaseToolCandidateImportDetail(candidateId),
    showcaseEntryId: showcase.id,
  };
}
