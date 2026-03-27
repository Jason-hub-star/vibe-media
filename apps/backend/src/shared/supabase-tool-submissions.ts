import type {
  ToolSubmission,
  ToolSubmissionStatus,
} from "@vibehub/content-contracts";

import { createSupabaseSql, getSupabaseDbUrl } from "./supabase-postgres";
import type { SaveShowcaseEntryInput } from "./supabase-showcase-actions";
import { saveSupabaseShowcaseEntry } from "./supabase-showcase-actions";
import {
  probeWebsite,
  screenToolSubmission,
  slugifyToolSubmission,
  type SubmissionDraftInput,
} from "./tool-submission-screening";

interface ToolSubmissionRow {
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
  submitter_email: string;
  submitter_name: string | null;
  status: ToolSubmissionStatus;
  screening_status: ToolSubmission["screeningStatus"];
  screening_score: number;
  screening_notes: string[];
  origin_ip_hash: string | null;
  user_agent_hash: string | null;
  source_locale: string;
  target_locales: string[];
  submitted_by_account_id: string | null;
  promoted_showcase_entry_id: string | null;
  created_at: string;
  updated_at: string;
}

interface DuplicateContextRow {
  duplicate_submission_slug: boolean;
  duplicate_submission_website_url: boolean;
  duplicate_showcase_slug: boolean;
  duplicate_showcase_website_url: boolean;
}

export interface SaveToolSubmissionInput extends SubmissionDraftInput {
  honeypot?: string | null;
}

const TOOL_SUBMISSIONS_CACHE_TTL_MS = 15_000;
const SUBMISSION_RATE_LIMIT_WINDOW_MINUTES = 10;
const SUBMISSION_RATE_LIMIT_MAX = 3;

let cachedAdminSubmissions: ToolSubmission[] | null = null;
let cachedLatestSubmissions: ToolSubmission[] | null = null;
let cachedAt = 0;
let inFlight: Promise<ToolSubmission[] | null> | null = null;

function canReadSupabase() {
  try {
    getSupabaseDbUrl();
    return true;
  } catch {
    return false;
  }
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function mapToolSubmission(row: ToolSubmissionRow): ToolSubmission {
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
    submitterEmail: row.submitter_email,
    submitterName: row.submitter_name,
    status: row.status,
    screeningStatus: row.screening_status,
    screeningScore: Number(row.screening_score ?? 0),
    screeningNotes: toStringArray(row.screening_notes),
    originIpHash: row.origin_ip_hash,
    userAgentHash: row.user_agent_hash,
    sourceLocale: row.source_locale,
    targetLocales: toStringArray(row.target_locales),
    submittedByAccountId: row.submitted_by_account_id,
    promotedShowcaseEntryId: row.promoted_showcase_entry_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchAllToolSubmissions() {
  const sql = createSupabaseSql();

  try {
    const rows = await sql<ToolSubmissionRow[]>`
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
        tags,
        submitter_email,
        submitter_name,
        status,
        screening_status,
        screening_score,
        screening_notes,
        origin_ip_hash,
        user_agent_hash,
        source_locale,
        target_locales,
        submitted_by_account_id,
        promoted_showcase_entry_id,
        created_at,
        updated_at
      from public.tool_submissions
      order by created_at desc, title asc
    `;

    return rows.map(mapToolSubmission);
  } finally {
    await sql.end();
  }
}

async function readAllToolSubmissions() {
  if (!canReadSupabase()) return null;

  const now = Date.now();
  if (cachedAdminSubmissions && now - cachedAt < TOOL_SUBMISSIONS_CACHE_TTL_MS) {
    return cachedAdminSubmissions;
  }

  if (inFlight) return inFlight;

  inFlight = fetchAllToolSubmissions()
    .then((rows) => {
      cachedAdminSubmissions = rows;
      cachedLatestSubmissions = rows.filter((item) => item.status === "approved_for_listing");
      cachedAt = Date.now();
      return rows;
    })
    .catch(() => null)
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

export async function listSupabaseToolSubmissions() {
  return readAllToolSubmissions();
}

export async function listSupabaseLatestToolSubmissions() {
  if (!canReadSupabase()) return null;

  const now = Date.now();
  if (cachedLatestSubmissions && now - cachedAt < TOOL_SUBMISSIONS_CACHE_TTL_MS) {
    return cachedLatestSubmissions;
  }

  const rows = await readAllToolSubmissions();
  return rows?.filter((item) => item.status === "approved_for_listing") ?? null;
}

export async function getSupabaseToolSubmissionDetail(id: string) {
  return (await readAllToolSubmissions())?.find((item) => item.id === id) ?? null;
}

async function assertSubmissionRateLimit(sql: ReturnType<typeof createSupabaseSql>, input: {
  submitterEmail: string;
  originIpHash: string | null;
}) {
  const rows = await sql<Array<{ count: number }>>`
    select count(*)::int as count
    from public.tool_submissions
    where created_at >= now() - (${SUBMISSION_RATE_LIMIT_WINDOW_MINUTES}::int * interval '1 minute')
      and (
        submitter_email = ${input.submitterEmail}
        or (${input.originIpHash}::text is not null and origin_ip_hash = ${input.originIpHash})
      )
  `;

  if ((rows[0]?.count ?? 0) >= SUBMISSION_RATE_LIMIT_MAX) {
    throw new Error("Too many submissions from this source. Please try again later.");
  }
}

async function slugExists(sql: ReturnType<typeof createSupabaseSql>, slug: string) {
  const rows = await sql<Array<{ slug: string }>>`
    select slug
    from public.tool_submissions
    where slug = ${slug}
    limit 1
  `;

  return rows.length > 0;
}

async function buildUniqueSlug(sql: ReturnType<typeof createSupabaseSql>, baseSlug: string) {
  const normalized = slugifyToolSubmission(baseSlug);
  if (!normalized) {
    throw new Error("Submission title must produce a valid slug.");
  }

  let candidate = normalized;
  let suffix = 2;
  while (await slugExists(sql, candidate)) {
    candidate = slugifyToolSubmission(`${normalized}-${suffix}`);
    suffix += 1;
  }

  return candidate;
}

async function loadDuplicateContext(sql: ReturnType<typeof createSupabaseSql>, input: {
  slug: string;
  websiteUrl: string;
}) {
  const rows = await sql<DuplicateContextRow[]>`
    select
      exists(select 1 from public.tool_submissions where slug = ${input.slug}) as duplicate_submission_slug,
      exists(select 1 from public.tool_submissions where website_url = ${input.websiteUrl}) as duplicate_submission_website_url,
      exists(select 1 from public.showcase_entries where slug = ${input.slug}) as duplicate_showcase_slug,
      exists(select 1 from public.showcase_entries where primary_link_href = ${input.websiteUrl}) as duplicate_showcase_website_url
  `;

  return {
    duplicateSlug: Boolean(
      rows[0]?.duplicate_submission_slug || rows[0]?.duplicate_showcase_slug,
    ),
    duplicateWebsiteUrl: Boolean(
      rows[0]?.duplicate_submission_website_url ||
        rows[0]?.duplicate_showcase_website_url,
    ),
  };
}

export async function saveSupabaseToolSubmission(input: SaveToolSubmissionInput) {
  if (!canReadSupabase()) {
    throw new Error("Tool submissions require a configured Supabase database.");
  }

  if (input.honeypot?.trim()) {
    throw new Error("Submission blocked.");
  }

  const sql = createSupabaseSql();

  try {
    const websiteReachable = await probeWebsite(input.websiteUrl);
    const screenedSeed = screenToolSubmission(input, {
      duplicateSlug: false,
      duplicateWebsiteUrl: false,
      websiteReachable,
    });

    await assertSubmissionRateLimit(sql, {
      submitterEmail: screenedSeed.submitterEmail,
      originIpHash: screenedSeed.originIpHash,
    });

    const duplicateContext = await loadDuplicateContext(sql, {
      slug: screenedSeed.slug,
      websiteUrl: screenedSeed.websiteUrl,
    });

    const screened = screenToolSubmission(input, {
      ...duplicateContext,
      websiteReachable,
    });

    const slug = await buildUniqueSlug(sql, screened.slug);

    const rows = await sql<ToolSubmissionRow[]>`
      insert into public.tool_submissions (
        slug,
        title,
        summary,
        description,
        website_url,
        github_url,
        demo_url,
        docs_url,
        tags,
        submitter_email,
        submitter_name,
        status,
        screening_status,
        screening_score,
        screening_notes,
        origin_ip_hash,
        user_agent_hash,
        source_locale,
        target_locales,
        submitted_by_account_id
      )
      values (
        ${slug},
        ${input.title.trim()},
        ${screened.summary},
        ${screened.description},
        ${screened.websiteUrl},
        ${screened.githubUrl},
        ${screened.demoUrl},
        ${screened.docsUrl},
        ${JSON.stringify(screened.tags)}::jsonb,
        ${screened.submitterEmail},
        ${screened.submitterName},
        ${screened.status},
        ${screened.screeningStatus},
        ${screened.screeningScore},
        ${JSON.stringify(screened.screeningNotes)}::jsonb,
        ${screened.originIpHash},
        ${screened.userAgentHash},
        ${screened.sourceLocale},
        ${JSON.stringify(screened.targetLocales)}::jsonb,
        ${null}::uuid
      )
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
        submitter_email,
        submitter_name,
        status,
        screening_status,
        screening_score,
        screening_notes,
        origin_ip_hash,
        user_agent_hash,
        source_locale,
        target_locales,
        submitted_by_account_id,
        promoted_showcase_entry_id,
        created_at,
        updated_at
    `;

    cachedAdminSubmissions = null;
    cachedLatestSubmissions = null;

    const saved = rows[0];
    if (!saved) {
      throw new Error("Failed to save tool submission.");
    }

    return mapToolSubmission(saved);
  } finally {
    await sql.end();
  }
}

export async function updateSupabaseToolSubmissionStatus(args: {
  submissionId: string;
  status: ToolSubmissionStatus;
  screeningStatus?: ToolSubmission["screeningStatus"];
  note?: string | null;
}) {
  const sql = createSupabaseSql();

  try {
    const rows = await sql<ToolSubmissionRow[]>`
      update public.tool_submissions
      set
        status = ${args.status},
        screening_status = coalesce(${args.screeningStatus ?? null}, screening_status),
        screening_notes = case
          when ${args.note ?? null}::text is null then screening_notes
          else screening_notes || jsonb_build_array(${args.note ?? null})
        end,
        updated_at = now()
      where id = ${args.submissionId}::uuid
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
        submitter_email,
        submitter_name,
        status,
        screening_status,
        screening_score,
        screening_notes,
        origin_ip_hash,
        user_agent_hash,
        source_locale,
        target_locales,
        submitted_by_account_id,
        promoted_showcase_entry_id,
        created_at,
        updated_at
    `;

    cachedAdminSubmissions = null;
    cachedLatestSubmissions = null;
    return rows[0] ? mapToolSubmission(rows[0]) : null;
  } finally {
    await sql.end();
  }
}

function toShowcaseInput(submission: ToolSubmission): SaveShowcaseEntryInput {
  const primaryLink =
    submission.demoUrl
      ? { kind: "demo" as const, label: "Open demo", href: submission.demoUrl }
      : submission.websiteUrl
        ? { kind: "primary" as const, label: "Visit website", href: submission.websiteUrl }
        : submission.githubUrl
          ? { kind: "github" as const, label: "GitHub", href: submission.githubUrl }
          : { kind: "docs" as const, label: "Read docs", href: submission.docsUrl ?? submission.websiteUrl };

  const links = [
    submission.websiteUrl && submission.websiteUrl !== primaryLink.href
      ? { kind: "primary" as const, label: "Website", href: submission.websiteUrl }
      : null,
    submission.githubUrl && submission.githubUrl !== primaryLink.href
      ? { kind: "github" as const, label: "GitHub", href: submission.githubUrl }
      : null,
    submission.demoUrl && submission.demoUrl !== primaryLink.href
      ? { kind: "demo" as const, label: "Demo", href: submission.demoUrl }
      : null,
    submission.docsUrl && submission.docsUrl !== primaryLink.href
      ? { kind: "docs" as const, label: "Docs", href: submission.docsUrl }
      : null,
  ].filter((link): link is NonNullable<typeof link> => Boolean(link));

  return {
    slug: submission.slug,
    title: submission.title,
    summary: submission.summary,
    body: submission.description
      ? submission.description.split(/\n+/).map((line) => line.trim()).filter(Boolean)
      : [submission.summary],
    coverAsset: "/placeholders/source-strip-placeholder.svg",
    tags: submission.tags,
    primaryLink,
    links,
    reviewStatus: "approved",
    origin: "user_submission",
    createdBy: "operator",
    submittedBy: submission.submitterEmail,
    authorLabel: submission.submitterName,
    featuredHome: false,
    featuredRadar: false,
    featuredSubmitHub: true,
    publishedAt: new Date().toISOString(),
  };
}

export async function promoteSupabaseToolSubmissionToShowcase(submissionId: string) {
  const submission = await getSupabaseToolSubmissionDetail(submissionId);
  if (!submission) {
    throw new Error("Submission not found.");
  }

  if (submission.promotedShowcaseEntryId) {
    return {
      submission,
      showcaseEntryId: submission.promotedShowcaseEntryId,
    };
  }

  if (!["approved_for_listing", "screened"].includes(submission.status)) {
    throw new Error("Only screened submissions can be promoted to showcase.");
  }

  const showcase = await saveSupabaseShowcaseEntry(toShowcaseInput(submission));
  await updateSupabaseToolSubmissionStatus({
    submissionId,
    status: "promoted_to_showcase",
    screeningStatus: "passed",
    note: `Promoted to showcase (${showcase.id}).`,
  });

  const sql = createSupabaseSql();
  try {
    await sql`
      update public.tool_submissions
      set promoted_showcase_entry_id = ${showcase.id}::uuid,
          updated_at = now()
      where id = ${submissionId}::uuid
    `;
  } finally {
    await sql.end();
  }

  cachedAdminSubmissions = null;
  cachedLatestSubmissions = null;

  return {
    submission: await getSupabaseToolSubmissionDetail(submissionId),
    showcaseEntryId: showcase.id,
  };
}
