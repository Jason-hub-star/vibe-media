import type {
  ToolCandidateImport,
  ToolCandidateImportScreeningStatus,
  ToolCandidateImportStatus,
} from "@vibehub/content-contracts";

export interface ToolCandidateImportRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  website_url: string;
  github_url: string | null;
  demo_url: string | null;
  docs_url: string | null;
  tags: string[];
  status: ToolCandidateImportStatus;
  screening_status: ToolCandidateImportScreeningStatus;
  screening_score: number;
  screening_notes: string[];
  source_id: string;
  source_name_snapshot: string;
  source_entry_url: string;
  source_entry_external_id: string | null;
  source_locale: string;
  target_locales: string[];
  first_seen_at: string;
  last_seen_at: string;
  imported_at: string;
  promoted_showcase_entry_id: string | null;
  linked_submission_id: string | null;
  created_at: string;
  updated_at: string;
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function mapToolCandidateImport(row: ToolCandidateImportRow): ToolCandidateImport {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    description: row.description,
    websiteUrl: row.website_url,
    githubUrl: row.github_url,
    demoUrl: row.demo_url,
    docsUrl: row.docs_url,
    tags: toStringArray(row.tags),
    status: row.status,
    screeningStatus: row.screening_status,
    screeningScore: Number(row.screening_score ?? 0),
    screeningNotes: toStringArray(row.screening_notes),
    sourceId: row.source_id,
    sourceName: row.source_name_snapshot,
    sourceEntryUrl: row.source_entry_url,
    sourceEntryExternalId: row.source_entry_external_id,
    sourceLocale: row.source_locale,
    targetLocales: toStringArray(row.target_locales),
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    importedAt: row.imported_at,
    promotedShowcaseEntryId: row.promoted_showcase_entry_id,
    linkedSubmissionId: row.linked_submission_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
