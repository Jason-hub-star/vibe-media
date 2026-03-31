interface NormalizeDiscoverCopyInput {
  title: string;
  summary: string;
  url?: string | null;
  sourceName?: string | null;
}

interface NormalizeDiscoverTagInput {
  tags: string[];
}

const RELEASE_SECTION_HEADING = /^(features?|bug fixes?|fixes|improvements?|performance|chores?|docs?|documentation|patch changes|dependencies|refactors?|tests?)$/i;
const VERSION_ONLY_TITLE = /^v?\d+(?:\.\d+){1,3}(?:[-._][a-z0-9]+)*$/i;
const VERSION_COMPARE_RANGE = /v?\d+(?:\.\d+){1,3}\s*\.\.\.\s*v?\d+(?:\.\d+){1,3}/i;

function decodeHtmlEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#8217;|&#x2019;|&#39;|&#x27;/gi, "'")
    .replace(/&#8216;|&#x2018;/gi, "'")
    .replace(/&#8220;|&#x201c;|&quot;/gi, '"')
    .replace(/&#8221;|&#x201d;/gi, '"')
    .replace(/&#8211;|&#x2013;/gi, "-")
    .replace(/&#8212;|&#x2014;/gi, "-")
    .replace(/&#8230;|&hellip;/gi, "...")
    .replace(/&#x1F4A1;/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripHtml(value: string) {
  return decodeHtmlEntities(value).replace(/<[^>]+>/g, " ");
}

function stripMarkdown(value: string) {
  return stripHtml(value)
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`{1,3}([^`]+)`{1,3}/g, "$1")
    .replace(/[*_~]/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*[-+*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function clampText(value: string, maxLength = 180) {
  const compact = compactWhitespace(value);
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 1).trim()}...`;
}

function ensureSentence(value: string) {
  const trimmed = compactWhitespace(value);
  if (!trimmed) return trimmed;

  const withTerminal = /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
  return withTerminal.charAt(0).toUpperCase() + withTerminal.slice(1);
}

function isGitHubReleaseUrl(url?: string | null) {
  return /github\.com\/[^/]+\/[^/]+\/releases(?:\/tag\/[^/]+)?/i.test(url ?? "");
}

function extractRepoSlug(url?: string | null) {
  const match = (url ?? "").match(/github\.com\/[^/]+\/([^/]+)\/releases/i);
  return match?.[1] ?? null;
}

function humanizeRepoToken(token: string) {
  const lower = token.toLowerCase();
  if (lower === "openai") return "OpenAI";
  if (lower === "anthropic") return "Anthropic";
  if (lower === "sdk") return "SDK";
  if (lower === "api") return "API";
  if (lower === "ai") return "AI";
  if (lower === "llm") return "LLM";
  if (lower === "ui") return "UI";
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function humanizeRepoSlug(repo: string) {
  return repo
    .split(/[-_]+/)
    .filter(Boolean)
    .map(humanizeRepoToken)
    .join(" ");
}

function looksGenericSourceName(value?: string | null) {
  if (!value) return true;
  return /^github releases?$/i.test(value.trim());
}

function cleanSummaryBoilerplate(value: string) {
  return value
    .replace(/^The post .*? appeared first on .*?\.\s*/i, "")
    .replace(/^This is today'?s edition of .*?\.\s*/i, "")
    .replace(/^Guest blog post by .*?\.\s*/i, "")
    .replace(/^본문영역\s*/i, "")
    .replace(/^\([^)]*사진:[^)]+\)\s*/i, "");
}

function formatReleaseScope(scope: string) {
  const lower = scope.toLowerCase();
  if (lower === "api") return "API";
  if (lower === "sdk") return "SDK";
  if (lower === "ci") return "CI";
  if (lower === "ui") return "UI";
  if (lower === "internal") return "Internal";
  return humanizeRepoToken(lower);
}

function polishReleasePhrase(value: string) {
  return value
    .replace(/\(\[[0-9a-f]{7,}\].*$/i, "")
    .replace(/\[[0-9a-f]{7,}\].*$/i, "")
    .replace(/^internal:\s*tweak ci branches\s*$/i, "CI branch updates")
    .replace(/^internal:\s*/i, "Internal update: ")
    .replace(/^chore:\s*/i, "Maintenance: ")
    .replace(/^docs:\s*/i, "Docs: ")
    .replace(/^fix:\s*/i, "Fix: ")
    .replace(/^ci:\s*/i, "CI: ")
    .trim();
}

function cleanReleaseLine(value: string) {
  return polishReleasePhrase(
    stripMarkdown(value)
    .replace(/^\d+(?:\.\d+){1,3}\s*\(\d{4}-\d{2}-\d{2}\)\s*/i, "")
    .replace(/^v?\d+(?:\.\d+){1,3}\s*/i, "")
    .replace(/^full changelog:\s*/i, "")
    .replace(
      /^(features?|bug fixes?|fixes|improvements?|performance|chores?|docs?|documentation|patch changes|dependencies|refactors?|tests?)\s+/i,
      ""
    )
    .replace(new RegExp(`^${VERSION_COMPARE_RANGE.source}\\s*`, "i"), "")
    .replace(/^([a-z0-9_-]+):\s*/i, (_, scope: string) => `${formatReleaseScope(scope)}: `)
    .replace(/\s+/g, " ")
    .trim()
  );
}

function isIgnorableReleaseLine(line: string) {
  return (
    !line ||
    VERSION_ONLY_TITLE.test(line) ||
    /^full changelog:/i.test(line) ||
    /^compare with/i.test(line) ||
    /^https?:\/\//i.test(line) ||
    RELEASE_SECTION_HEADING.test(line)
  );
}

function extractReleaseHighlight(summary: string) {
  const compactSummary = stripMarkdown(summary)
    .replace(/^\d+(?:\.\d+){1,3}\s*\(\d{4}-\d{2}-\d{2}\)\s*/i, "")
    .replace(/^full changelog:\s*/i, "")
    .replace(new RegExp(`^${VERSION_COMPARE_RANGE.source}\\s*`, "i"), "")
    .replace(/\bfull changelog:\s*/i, "")
    .replace(new RegExp(`\\b${VERSION_COMPARE_RANGE.source}\\b`, "ig"), " ")
    .replace(/\s*#{1,6}\s*(features?|bug fixes?|fixes|improvements?|performance|chores?|docs?|documentation|patch changes|dependencies|refactors?|tests?)\b/ig, " ")
    .replace(/\b(features?|bug fixes?|fixes|improvements?|performance|chores?|docs?|documentation|patch changes|dependencies|refactors?|tests?)\s*:\s*/ig, " ")
    .replace(/^\*\s+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const compactCandidate = cleanReleaseLine(compactSummary);
  if (compactCandidate && !isIgnorableReleaseLine(compactCandidate)) {
    return compactCandidate;
  }

  const lines = decodeHtmlEntities(summary)
    .split(/\n+/)
    .map((line) => cleanReleaseLine(line))
    .filter((line) => !isIgnorableReleaseLine(line));

  return lines[0] ?? "";
}

function looksLikeReleaseNotes(input: NormalizeDiscoverCopyInput) {
  const normalizedTitle = stripMarkdown(input.title);
  return (
    VERSION_ONLY_TITLE.test(normalizedTitle) ||
    /full changelog|patch changes|compare\/|^##\s*v?\d+(?:\.\d+){1,3}/im.test(input.summary)
  );
}

function normalizeTitle({ title, url, sourceName }: NormalizeDiscoverCopyInput) {
  const cleanedTitle = stripMarkdown(title) || "Release update";
  if (!isGitHubReleaseUrl(url) || !VERSION_ONLY_TITLE.test(cleanedTitle)) {
    return cleanedTitle;
  }

  const repoLabel = !looksGenericSourceName(sourceName)
    ? stripMarkdown(sourceName || "")
    : humanizeRepoSlug(extractRepoSlug(url) ?? "release");

  return `${repoLabel} ${cleanedTitle}`;
}

function extractMultipleHighlights(summary: string, maxItems = 3): string[] {
  const lines = decodeHtmlEntities(summary)
    .split(/\n+/)
    .map((line) => cleanReleaseLine(line))
    .filter((line) => !isIgnorableReleaseLine(line));

  return lines.slice(0, maxItems);
}

function normalizeReleaseSummary(input: NormalizeDiscoverCopyInput, normalizedTitle: string) {
  // 여러 항목을 결합하여 60자+ summary 생성 시도 (M3)
  const highlights = extractMultipleHighlights(input.summary);
  if (highlights.length >= 2) {
    const combined = `${ensureSentence(highlights[0])} Also: ${highlights.slice(1).join("; ")}.`;
    if (combined.length >= 60) {
      return clampText(combined);
    }
  }

  // 기존 단일 하이라이트 경로 (기존 동작 보존)
  const highlight = extractReleaseHighlight(input.summary);
  if (highlight) {
    return clampText(ensureSentence(highlight));
  }

  return clampText(`Release update for ${normalizedTitle}. Open GitHub to inspect the exact changelog.`);
}

function normalizeGenericSummary(summary: string) {
  const cleaned = cleanSummaryBoilerplate(stripMarkdown(summary));
  return clampText(cleaned || "Open the source for more details.");
}

export function normalizeDiscoverCopy(input: NormalizeDiscoverCopyInput) {
  const normalizedTitle = normalizeTitle(input);
  const normalizedSummary =
    isGitHubReleaseUrl(input.url) || looksLikeReleaseNotes(input)
      ? normalizeReleaseSummary(input, normalizedTitle)
      : normalizeGenericSummary(input.summary);

  return {
    title: normalizedTitle,
    summary: normalizedSummary
  };
}

export function normalizeDiscoverTags({ tags }: NormalizeDiscoverTagInput) {
  const normalized = tags
    .filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
    .map((tag) => tag.replace(/[-_]+/g, " ").trim())
    .map((tag) => tag.split(/\s+/).map((part) => humanizeRepoToken(part)).join(" "))
    .filter((tag, index, list) => list.indexOf(tag) === index);

  const withoutGeneric = normalized.filter((tag) => tag !== "Repo" && tag !== "Release");
  return withoutGeneric.length > 0 ? withoutGeneric : normalized;
}
