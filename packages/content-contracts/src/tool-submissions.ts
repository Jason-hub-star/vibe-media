import type { LocaleCode } from "./locales";

export type ToolSubmissionStatus =
  | "submitted"
  | "screened"
  | "approved_for_listing"
  | "promoted_to_showcase"
  | "screening_failed"
  | "rejected"
  | "spam_blocked";

export type SubmissionScreeningStatus =
  | "pending"
  | "passed"
  | "failed"
  | "duplicate"
  | "spam_blocked";

export interface ToolSubmission {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  websiteUrl: string;
  githubUrl: string | null;
  demoUrl: string | null;
  docsUrl: string | null;
  tags: string[];
  submitterEmail: string;
  submitterName: string | null;
  status: ToolSubmissionStatus;
  screeningStatus: SubmissionScreeningStatus;
  screeningScore: number;
  screeningNotes: string[];
  originIpHash: string | null;
  userAgentHash: string | null;
  sourceLocale: LocaleCode;
  targetLocales: LocaleCode[];
  submittedByAccountId: string | null;
  promotedShowcaseEntryId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ToolSubmissionTeaser {
  id: string;
  slug: string;
  title: string;
  summary: string;
  websiteUrl: string;
  githubUrl: string | null;
  demoUrl: string | null;
  docsUrl: string | null;
  tags: string[];
  submitterName: string | null;
  status: ToolSubmissionStatus;
  screeningStatus: SubmissionScreeningStatus;
  createdAt: string;
}
