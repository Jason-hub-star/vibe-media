import type { LocaleCode } from "./locales";

export type ToolCandidateImportStatus =
  | "imported"
  | "approved_for_listing"
  | "promoted_to_showcase"
  | "hidden_from_listing"
  | "duplicate_blocked"
  | "rejected"
  | "spam_blocked";

export type ToolCandidateImportScreeningStatus =
  | "pending"
  | "passed"
  | "failed"
  | "duplicate"
  | "spam_blocked";

export interface ToolCandidateImport {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  websiteUrl: string;
  githubUrl: string | null;
  demoUrl: string | null;
  docsUrl: string | null;
  coverImageUrl: string | null;
  tags: string[];
  status: ToolCandidateImportStatus;
  screeningStatus: ToolCandidateImportScreeningStatus;
  screeningScore: number;
  screeningNotes: string[];
  sourceId: string;
  sourceName: string;
  sourceEntryUrl: string;
  sourceEntryExternalId: string | null;
  sourceLocale: LocaleCode;
  targetLocales: LocaleCode[];
  firstSeenAt: string;
  lastSeenAt: string;
  importedAt: string;
  promotedShowcaseEntryId: string | null;
  linkedSubmissionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ToolCandidateImportTeaser {
  id: string;
  slug: string;
  title: string;
  summary: string;
  websiteUrl: string;
  githubUrl: string | null;
  demoUrl: string | null;
  docsUrl: string | null;
  coverImageUrl: string | null;
  tags: string[];
  status: ToolCandidateImportStatus;
  screeningStatus: ToolCandidateImportScreeningStatus;
  screeningScore: number;
  sourceName: string;
  sourceEntryUrl: string;
  importedAt: string;
}
