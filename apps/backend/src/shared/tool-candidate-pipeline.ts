import { listShowcaseEntries } from "../features/showcase/list-showcase-entries";
import { listImportedToolCandidates } from "../features/tool-candidate-imports/list-tool-candidate-imports";
import { listToolSubmissions } from "../features/tool-submissions/list-tool-submissions";
import { getSupabaseDbUrl } from "./supabase-postgres";
import { upsertSupabaseToolCandidateImports } from "./supabase-tool-candidate-imports";
import {
  readToolCandidateFetchState,
  readToolCandidateScreenedState,
  writeToolCandidateFetchState,
  writeToolCandidateScreenedState,
  type ToolCandidateFetchState,
  type ToolCandidateScreenedState,
} from "./tool-candidate-import-state";
import {
  buildImportedScreeningContext,
  type ScreenedImportedToolCandidate,
  screenImportedToolCandidate,
} from "./tool-candidate-import-screening";
import { fetchImportedToolCandidates } from "./tool-candidate-fetch";
import { normalizeSubmissionUrl, slugifyToolSubmission } from "./tool-submission-screening";

function canUseSupabase() {
  try {
    getSupabaseDbUrl();
    return true;
  } catch {
    return false;
  }
}

function safeNormalizeUrl(value: string) {
  try {
    return normalizeSubmissionUrl(value, "Website URL");
  } catch {
    return value.trim();
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isSameImportedRecord(args: {
  sourceId: string;
  sourceEntryUrl: string;
  sourceEntryExternalId?: string | null;
}, existing: {
  sourceId: string;
  sourceEntryUrl: string;
  sourceEntryExternalId: string | null;
}) {
  if (existing.sourceId !== args.sourceId) return false;
  if (existing.sourceEntryUrl === args.sourceEntryUrl) return true;
  if (args.sourceEntryExternalId && existing.sourceEntryExternalId === args.sourceEntryExternalId) {
    return true;
  }
  return false;
}

export async function runToolCandidateFetch() {
  const report = await fetchImportedToolCandidates();
  const state: ToolCandidateFetchState = {
    performedAt: report.performedAt,
    candidates: report.candidates,
    sourceStatuses: report.sourceStatuses,
  };
  writeToolCandidateFetchState(state);
  return state;
}

export async function runToolCandidateScreen() {
  const fetchState = readToolCandidateFetchState() ?? (await runToolCandidateFetch());
  const [existingImports, existingSubmissions, showcaseEntries] = await Promise.all([
    listImportedToolCandidates().catch(() => []),
    listToolSubmissions().catch(() => []),
    listShowcaseEntries().catch(() => []),
  ]);

  const screened: ScreenedImportedToolCandidate[] = [];
  const errors: ToolCandidateScreenedState["errors"] = [];

  for (const candidate of fetchState.candidates) {
    try {
      const websiteUrl = safeNormalizeUrl(candidate.websiteUrl);
      const slug = slugifyToolSubmission(candidate.title);
      const duplicateImport = existingImports.find((item) => {
        if (isSameImportedRecord(candidate, item)) return false;
        return item.websiteUrl === websiteUrl || item.slug === slug;
      });
      const duplicateSubmission = existingSubmissions.find(
        (item) => item.websiteUrl === websiteUrl || item.slug === slug,
      );
      const duplicateShowcase = showcaseEntries.find((item) => {
        const showcaseLinks = [item.primaryLink.href, ...item.links.map((link) => link.href)];
        return showcaseLinks.includes(websiteUrl) || item.slug === slug;
      });

      const context = await buildImportedScreeningContext({
        title: candidate.title,
        websiteUrl: candidate.websiteUrl,
        duplicateSlug: Boolean(duplicateImport || duplicateSubmission || duplicateShowcase),
        duplicateWebsiteUrl: Boolean(
          duplicateImport?.websiteUrl === websiteUrl ||
            duplicateSubmission?.websiteUrl === websiteUrl ||
            duplicateShowcase,
        ),
      });

      screened.push(screenImportedToolCandidate(candidate, context));
    } catch (error) {
      errors.push({
        sourceId: candidate.sourceId,
        title: candidate.title,
        message: error instanceof Error ? error.message : "Unknown screening error",
      });
    }
  }

  const state: ToolCandidateScreenedState = {
    performedAt: fetchState.performedAt,
    candidates: screened,
    sourceStatuses: fetchState.sourceStatuses,
    errors,
  };
  writeToolCandidateScreenedState(state);
  return state;
}

export async function runToolCandidateSync() {
  const screenedState = readToolCandidateScreenedState() ?? (await runToolCandidateScreen());
  const errors = screenedState.errors ?? [];

  const hasResolvableSourceIds = screenedState.candidates.every((item) => isUuid(item.sourceId));
  if (!canUseSupabase() || !hasResolvableSourceIds) {
    const nextErrors = hasResolvableSourceIds
      ? errors
      : [
          ...errors,
          {
            sourceId: "tool-candidate-sources",
            title: "Imported source registry",
            message:
              "Tool candidate sources are using fallback ids, so sync stayed in mock mode until Supabase source rows exist.",
          },
        ];

    return {
      source: "mock" as const,
      performedAt: screenedState.performedAt,
      imports: screenedState.candidates,
      errors: nextErrors,
    };
  }

  const imports = await upsertSupabaseToolCandidateImports({
    candidates: screenedState.candidates,
    importedAt: screenedState.performedAt,
  });

  return {
    source: "supabase" as const,
    performedAt: screenedState.performedAt,
    imports,
    errors,
  };
}
