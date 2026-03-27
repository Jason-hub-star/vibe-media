import type { ToolSubmission, ShowcaseLink } from "@vibehub/content-contracts";

import { showcaseEntries, toolSubmissions as mockToolSubmissions } from "../../shared/mock-data";
import { getSupabaseDbUrl } from "../../shared/supabase-postgres";
import {
  getSupabaseToolSubmissionDetail,
  listSupabaseLatestToolSubmissions,
  listSupabaseToolSubmissions,
  promoteSupabaseToolSubmissionToShowcase,
  saveSupabaseToolSubmission,
  updateSupabaseToolSubmissionStatus,
  type SaveToolSubmissionInput,
} from "../../shared/supabase-tool-submissions";
import {
  probeWebsite,
  screenToolSubmission,
} from "../../shared/tool-submission-screening";

function canUseSupabase() {
  try {
    getSupabaseDbUrl();
    return true;
  } catch {
    return false;
  }
}

function sortToolSubmissions(entries: ToolSubmission[]) {
  return [...entries].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function mapLatest(entries: ToolSubmission[]) {
  return sortToolSubmissions(entries).filter((item) => item.status === "approved_for_listing");
}

export async function listToolSubmissions(): Promise<ToolSubmission[]> {
  if (canUseSupabase()) {
    const rows = await listSupabaseToolSubmissions();
    if (rows) return sortToolSubmissions(rows);
  }

  return sortToolSubmissions(mockToolSubmissions);
}

export async function listLatestToolSubmissions(): Promise<ToolSubmission[]> {
  if (canUseSupabase()) {
    const rows = await listSupabaseLatestToolSubmissions();
    if (rows) return sortToolSubmissions(rows);
  }

  return mapLatest(mockToolSubmissions);
}

export async function getToolSubmissionDetail(id: string): Promise<ToolSubmission | null> {
  if (canUseSupabase()) {
    const row = await getSupabaseToolSubmissionDetail(id);
    if (row) return row;
  }

  return mockToolSubmissions.find((item) => item.id === id) ?? null;
}

export async function submitToolSubmission(input: SaveToolSubmissionInput) {
  if (canUseSupabase()) {
    return saveSupabaseToolSubmission(input);
  }

  if (input.honeypot?.trim()) {
    throw new Error("Submission blocked.");
  }

  const websiteReachable = await probeWebsite(input.websiteUrl);
  const existing = mockToolSubmissions.some(
    (item) =>
      item.websiteUrl === input.websiteUrl.trim() ||
      item.slug === (input.slug?.trim() || input.title.trim().toLowerCase().replace(/\s+/g, "-")),
  );
  const screened = screenToolSubmission(input, {
    duplicateSlug: existing,
    duplicateWebsiteUrl: existing,
    websiteReachable,
  });

  const next: ToolSubmission = {
    id: `submission-${screened.slug}`,
    slug: screened.slug,
    title: input.title.trim(),
    summary: screened.summary,
    description: screened.description,
    websiteUrl: screened.websiteUrl,
    githubUrl: screened.githubUrl,
    demoUrl: screened.demoUrl,
    docsUrl: screened.docsUrl,
    tags: screened.tags,
    submitterEmail: screened.submitterEmail,
    submitterName: screened.submitterName,
    status: screened.status,
    screeningStatus: screened.screeningStatus,
    screeningScore: screened.screeningScore,
    screeningNotes: screened.screeningNotes,
    originIpHash: screened.originIpHash,
    userAgentHash: screened.userAgentHash,
    sourceLocale: screened.sourceLocale,
    targetLocales: screened.targetLocales,
    submittedByAccountId: null,
    promotedShowcaseEntryId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  mockToolSubmissions.unshift(next);
  return next;
}

export async function rejectToolSubmission(args: { submissionId: string; note?: string | null }) {
  if (canUseSupabase()) {
    return updateSupabaseToolSubmissionStatus({
      submissionId: args.submissionId,
      status: "rejected",
      screeningStatus: "failed",
      note: args.note ?? "Rejected by operator.",
    });
  }

  const target = mockToolSubmissions.find((item) => item.id === args.submissionId);
  if (!target) return null;
  target.status = "rejected";
  target.screeningStatus = "failed";
  target.screeningNotes = [...target.screeningNotes, args.note ?? "Rejected by operator."];
  target.updatedAt = new Date().toISOString();
  return target;
}

export async function promoteToolSubmissionToShowcase(submissionId: string) {
  if (canUseSupabase()) {
    return promoteSupabaseToolSubmissionToShowcase(submissionId);
  }

  const submission = mockToolSubmissions.find((item) => item.id === submissionId);
  if (!submission) {
    throw new Error("Submission not found.");
  }

  if (!["approved_for_listing", "screened"].includes(submission.status)) {
    throw new Error("Only screened submissions can be promoted to showcase.");
  }

  const showcaseId = `showcase-${submission.slug}`;
  submission.status = "promoted_to_showcase";
  submission.promotedShowcaseEntryId = showcaseId;
  submission.updatedAt = new Date().toISOString();

  showcaseEntries.unshift({
    id: showcaseId,
    slug: submission.slug,
    title: submission.title,
    summary: submission.summary,
    body: submission.description ? [submission.description] : [submission.summary],
    coverAsset: "/placeholders/source-strip-placeholder.svg",
    tags: submission.tags,
    primaryLink: submission.demoUrl
      ? { kind: "demo", label: "Open demo", href: submission.demoUrl }
      : { kind: "primary", label: "Visit website", href: submission.websiteUrl },
    links: ([
      submission.githubUrl
        ? { kind: "github" as const, label: "GitHub", href: submission.githubUrl }
        : null,
      submission.docsUrl
        ? { kind: "docs" as const, label: "Docs", href: submission.docsUrl }
        : null,
    ].filter(Boolean) as ShowcaseLink[]),
    reviewStatus: "approved",
    scheduledAt: null,
    publishedAt: new Date().toISOString(),
    origin: "user_submission",
    createdBy: "operator",
    submittedBy: submission.submitterEmail,
    authorLabel: submission.submitterName,
    sourceDiscoverItemId: null,
    featuredHome: false,
    featuredRadar: false,
    featuredSubmitHub: true,
    displayOrder: 10,
  });

  return { submission, showcaseEntryId: showcaseId };
}
