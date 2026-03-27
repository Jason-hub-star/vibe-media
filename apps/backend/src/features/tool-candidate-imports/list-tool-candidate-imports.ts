import type { ToolCandidateImport, ShowcaseLink } from "@vibehub/content-contracts";

import {
  showcaseEntries,
  toolCandidateImports as mockToolCandidateImports,
} from "../../shared/mock-data";
import { getSupabaseDbUrl } from "../../shared/supabase-postgres";
import { readToolCandidateScreenedState } from "../../shared/tool-candidate-import-state";
import {
  getSupabaseToolCandidateImportDetail,
  listSupabaseImportedToolCandidatesForListing,
  listSupabaseToolCandidateImports,
  promoteSupabaseToolCandidateImportToShowcase,
  updateSupabaseToolCandidateImportStatus,
} from "../../shared/supabase-tool-candidate-imports";

function canUseSupabase() {
  try {
    getSupabaseDbUrl();
    return true;
  } catch {
    return false;
  }
}

function sortToolCandidateImports(entries: ToolCandidateImport[]) {
  return [...entries].sort((left, right) => right.importedAt.localeCompare(left.importedAt));
}

function mapListing(entries: ToolCandidateImport[]) {
  return sortToolCandidateImports(entries).filter((item) => item.status === "approved_for_listing");
}

function hasMockOnlyImportedState() {
  const screenedState = readToolCandidateScreenedState();
  if (!screenedState || screenedState.candidates.length === 0) {
    return false;
  }

  return screenedState.candidates.some(
    (item) =>
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        item.sourceId,
      ),
  );
}

export async function listImportedToolCandidates(): Promise<ToolCandidateImport[]> {
  if (canUseSupabase()) {
    const rows = await listSupabaseToolCandidateImports();
    if (rows && rows.length > 0) return sortToolCandidateImports(rows);
    if (!hasMockOnlyImportedState()) return [];
  }

  return sortToolCandidateImports(mockToolCandidateImports);
}

export async function listImportedToolCandidatesForListing(): Promise<ToolCandidateImport[]> {
  if (canUseSupabase()) {
    const rows = await listSupabaseImportedToolCandidatesForListing();
    if (rows && rows.length > 0) return sortToolCandidateImports(rows);
    if (!hasMockOnlyImportedState()) return [];
  }

  return mapListing(mockToolCandidateImports);
}

export async function getImportedToolCandidateDetail(id: string): Promise<ToolCandidateImport | null> {
  if (canUseSupabase()) {
    const row = await getSupabaseToolCandidateImportDetail(id);
    if (row) return row;
  }

  return mockToolCandidateImports.find((item) => item.id === id) ?? null;
}

export async function rejectImportedToolCandidate(args: {
  candidateId: string;
  note?: string | null;
}) {
  if (canUseSupabase()) {
    return updateSupabaseToolCandidateImportStatus({
      candidateId: args.candidateId,
      status: "rejected",
      screeningStatus: "failed",
      note: args.note ?? "Rejected by operator.",
    });
  }

  const target = mockToolCandidateImports.find((item) => item.id === args.candidateId);
  if (!target) return null;
  target.status = "rejected";
  target.screeningStatus = "failed";
  target.screeningNotes = [...target.screeningNotes, args.note ?? "Rejected by operator."];
  target.updatedAt = new Date().toISOString();
  return target;
}

export async function hideImportedToolCandidate(args: {
  candidateId: string;
  note?: string | null;
}) {
  if (canUseSupabase()) {
    return updateSupabaseToolCandidateImportStatus({
      candidateId: args.candidateId,
      status: "hidden_from_listing",
      screeningStatus: "failed",
      note: args.note ?? "Hidden from public imported listing.",
    });
  }

  const target = mockToolCandidateImports.find((item) => item.id === args.candidateId);
  if (!target) return null;
  target.status = "hidden_from_listing";
  target.screeningStatus = "failed";
  target.screeningNotes = [...target.screeningNotes, args.note ?? "Hidden from public imported listing."];
  target.updatedAt = new Date().toISOString();
  return target;
}

export async function promoteImportedToolCandidateToShowcase(candidateId: string) {
  if (canUseSupabase()) {
    return promoteSupabaseToolCandidateImportToShowcase(candidateId);
  }

  const candidate = mockToolCandidateImports.find((item) => item.id === candidateId);
  if (!candidate) {
    throw new Error("Imported candidate not found.");
  }

  if (candidate.status !== "approved_for_listing") {
    throw new Error("Only approved imported candidates can be promoted to showcase.");
  }

  const showcaseId = `showcase-${candidate.slug}`;
  candidate.status = "promoted_to_showcase";
  candidate.promotedShowcaseEntryId = showcaseId;
  candidate.updatedAt = new Date().toISOString();

  showcaseEntries.unshift({
    id: showcaseId,
    slug: candidate.slug,
    title: candidate.title,
    summary: candidate.summary,
    body: candidate.description ? [candidate.description] : [candidate.summary],
    coverAsset: "/placeholders/source-strip-placeholder.svg",
    tags: [...candidate.tags, "imported"].slice(0, 6),
    primaryLink: candidate.demoUrl
      ? { kind: "demo", label: "Open demo", href: candidate.demoUrl }
      : { kind: "primary", label: "Visit website", href: candidate.websiteUrl },
    links: ([
      candidate.githubUrl
        ? { kind: "github" as const, label: "GitHub", href: candidate.githubUrl }
        : null,
      candidate.docsUrl
        ? { kind: "docs" as const, label: "Docs", href: candidate.docsUrl }
        : null,
      { kind: "brief" as const, label: `Source · ${candidate.sourceName}`, href: candidate.sourceEntryUrl },
    ].filter(Boolean) as ShowcaseLink[]),
    reviewStatus: "approved",
    scheduledAt: null,
    publishedAt: new Date().toISOString(),
    origin: "imported",
    createdBy: "operator",
    submittedBy: null,
    authorLabel: candidate.sourceName,
    sourceDiscoverItemId: null,
    featuredHome: false,
    featuredRadar: false,
    featuredSubmitHub: true,
    displayOrder: 10,
  });

  return { candidate, showcaseEntryId: showcaseId };
}
