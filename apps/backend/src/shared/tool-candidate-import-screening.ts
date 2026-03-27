import {
  DEFAULT_CANONICAL_LOCALE,
  DEFAULT_TARGET_LOCALES,
  normalizeLocaleCodes,
  type ToolCandidateImportScreeningStatus,
  type ToolCandidateImportStatus,
} from "@vibehub/content-contracts";

import {
  normalizeSubmissionUrl,
  probeWebsite,
  slugifyToolSubmission,
} from "./tool-submission-screening";

const SPAM_PATTERNS = [
  /\bcasino\b/i,
  /\bbetting\b/i,
  /\bloan\b/i,
  /\bforex\b/i,
  /\bviagra\b/i,
  /\bbuy traffic\b/i,
];

export interface ImportedToolCandidateDraft {
  title: string;
  summary: string;
  description?: string | null;
  websiteUrl: string;
  githubUrl?: string | null;
  demoUrl?: string | null;
  docsUrl?: string | null;
  tags?: string[];
  sourceId: string;
  sourceName: string;
  sourceEntryUrl: string;
  sourceEntryExternalId?: string | null;
  sourceLocale?: string | null;
  targetLocales?: string[] | null;
}

export interface ImportedToolCandidateScreeningContext {
  duplicateWebsiteUrl: boolean;
  duplicateSlug: boolean;
  websiteReachable: boolean;
}

export interface ScreenedImportedToolCandidate
  extends ImportedToolCandidateDraft {
  slug: string;
  summary: string;
  description: string;
  websiteUrl: string;
  githubUrl: string | null;
  demoUrl: string | null;
  docsUrl: string | null;
  tags: string[];
  sourceEntryUrl: string;
  sourceEntryExternalId: string | null;
  sourceLocale: string;
  targetLocales: string[];
  status: ToolCandidateImportStatus;
  screeningStatus: ToolCandidateImportScreeningStatus;
  screeningScore: number;
  screeningNotes: string[];
}

function clampScore(value: number) {
  return Math.max(0, Math.min(1, Number(value.toFixed(3))));
}

function normalizeTags(
  input: string[] | null | undefined,
  title: string,
  description: string,
  websiteUrl: string,
) {
  const inferred = new Set(
    Array.isArray(input)
      ? input.map((tag) => tag.trim().toLowerCase()).filter(Boolean)
      : [],
  );
  const haystack = `${title} ${description} ${websiteUrl}`.toLowerCase();

  if (/\bagent\b/.test(haystack)) inferred.add("agent");
  if (/\bautomation\b/.test(haystack)) inferred.add("automation");
  if (/\bopen source\b/.test(haystack)) inferred.add("open-source");
  if (/\bworkflow\b/.test(haystack)) inferred.add("workflow");
  if (/\bgithub\b/.test(haystack)) inferred.add("github");

  return [...inferred].slice(0, 6);
}

function detectSpam(input: ImportedToolCandidateDraft) {
  const text = `${input.title} ${input.summary} ${input.description ?? ""}`;
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) {
      return "Spam keyword heuristic matched.";
    }
  }
  return null;
}

export function screenImportedToolCandidate(
  input: ImportedToolCandidateDraft,
  context: ImportedToolCandidateScreeningContext,
): ScreenedImportedToolCandidate {
  const websiteUrl = normalizeSubmissionUrl(input.websiteUrl, "Website URL");
  if (!websiteUrl) {
    throw new Error("Website URL is required.");
  }

  const title = input.title.trim();
  const summary = input.summary.trim();
  const description = input.description?.trim() || "";
  const slug = slugifyToolSubmission(title);
  const githubUrl = normalizeSubmissionUrl(input.githubUrl ?? "", "GitHub URL");
  const demoUrl = normalizeSubmissionUrl(input.demoUrl ?? "", "Demo URL");
  const docsUrl = normalizeSubmissionUrl(input.docsUrl ?? "", "Docs URL");
  const sourceEntryUrl =
    normalizeSubmissionUrl(input.sourceEntryUrl, "Source entry URL") ?? input.sourceEntryUrl;

  if (!title || !summary || !slug) {
    throw new Error("Imported candidate requires title and summary.");
  }

  const notes: string[] = [`Imported from ${input.sourceName}.`];
  let score = 1;
  let status: ToolCandidateImportStatus = "approved_for_listing";
  let screeningStatus: ToolCandidateImportScreeningStatus = "passed";

  const spamReason = detectSpam(input);
  if (spamReason) {
    notes.push(spamReason);
    status = "spam_blocked";
    screeningStatus = "spam_blocked";
    score = 0.08;
  } else {
    if (context.duplicateSlug || context.duplicateWebsiteUrl) {
      notes.push("A similar tool already exists in submissions, showcase, or imports.");
      status = "duplicate_blocked";
      screeningStatus = "duplicate";
      score -= 0.45;
    }

    if (!context.websiteReachable) {
      notes.push("Imported site did not respond successfully during screening.");
      if (status === "approved_for_listing") {
        status = "hidden_from_listing";
      }
      if (screeningStatus !== "duplicate") {
        screeningStatus = "failed";
      }
      score -= 0.25;
    } else {
      notes.push("Imported website reachable.");
    }
  }

  const tags = normalizeTags(input.tags, title, description, websiteUrl);
  if (tags.length === 0) {
    notes.push("No tags inferred from imported candidate.");
    score -= 0.08;
  }

  return {
    ...input,
    slug,
    summary,
    description,
    websiteUrl,
    githubUrl,
    demoUrl,
    docsUrl,
    tags,
    sourceEntryUrl,
    sourceEntryExternalId: input.sourceEntryExternalId ?? null,
    sourceLocale: input.sourceLocale?.trim() || DEFAULT_CANONICAL_LOCALE,
    targetLocales: normalizeLocaleCodes(
      input.targetLocales ?? DEFAULT_TARGET_LOCALES,
      input.sourceLocale?.trim() || DEFAULT_CANONICAL_LOCALE,
    ),
    status,
    screeningStatus,
    screeningScore: clampScore(score),
    screeningNotes: notes,
  };
}

export async function buildImportedScreeningContext(args: {
  title: string;
  websiteUrl: string;
  duplicateSlug: boolean;
  duplicateWebsiteUrl: boolean;
}) {
  return {
    duplicateSlug: args.duplicateSlug,
    duplicateWebsiteUrl: args.duplicateWebsiteUrl,
    websiteReachable: await probeWebsite(args.websiteUrl),
  } satisfies ImportedToolCandidateScreeningContext;
}
