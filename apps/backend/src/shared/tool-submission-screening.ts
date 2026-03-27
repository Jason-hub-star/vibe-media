import { createHash } from "node:crypto";

import type {
  SubmissionScreeningStatus,
  ToolSubmissionStatus,
} from "@vibehub/content-contracts";
import {
  DEFAULT_CANONICAL_LOCALE,
  DEFAULT_TARGET_LOCALES,
  normalizeLocaleCodes,
} from "@vibehub/content-contracts";

const SPAM_PATTERNS = [
  /\bcasino\b/i,
  /\bbetting\b/i,
  /\bloan\b/i,
  /\bforex\b/i,
  /\bviagra\b/i,
  /\bseo package\b/i,
  /\bbuy traffic\b/i,
];

const TAG_KEYWORDS: Array<{ tag: string; pattern: RegExp }> = [
  { tag: "agent", pattern: /\bagent\b/i },
  { tag: "automation", pattern: /\bautomation\b/i },
  { tag: "api", pattern: /\bapi\b/i },
  { tag: "sdk", pattern: /\bsdk\b/i },
  { tag: "plugin", pattern: /\bplugin\b/i },
  { tag: "workflow", pattern: /\bworkflow\b/i },
  { tag: "open-source", pattern: /\bopen source\b/i },
];

export interface SubmissionDraftInput {
  title: string;
  slug?: string | null;
  summary: string;
  description?: string | null;
  websiteUrl: string;
  githubUrl?: string | null;
  demoUrl?: string | null;
  docsUrl?: string | null;
  tags?: string[];
  submitterEmail: string;
  submitterName?: string | null;
  originIp?: string | null;
  userAgent?: string | null;
  sourceLocale?: string | null;
  targetLocales?: string[] | null;
}

export interface ScreeningContext {
  duplicateWebsiteUrl: boolean;
  duplicateSlug: boolean;
  websiteReachable: boolean;
}

export interface ScreenedSubmission {
  slug: string;
  summary: string;
  description: string;
  websiteUrl: string;
  githubUrl: string | null;
  demoUrl: string | null;
  docsUrl: string | null;
  tags: string[];
  submitterEmail: string;
  submitterName: string | null;
  originIpHash: string | null;
  userAgentHash: string | null;
  sourceLocale: string;
  targetLocales: string[];
  status: ToolSubmissionStatus;
  screeningStatus: SubmissionScreeningStatus;
  screeningScore: number;
  screeningNotes: string[];
}

export function slugifyToolSubmission(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function normalizeSubmissionUrl(value: string, label: string) {
  const raw = value.trim();
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${label} must be a valid absolute URL.`);
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`${label} must start with http:// or https://.`);
  }

  if (!url.hostname.includes(".")) {
    throw new Error(`${label} must use a public hostname.`);
  }

  url.hash = "";
  if (url.pathname.endsWith("/") && url.pathname !== "/") {
    url.pathname = url.pathname.slice(0, -1);
  }

  return url.toString();
}

export async function probeWebsite(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);

  try {
    const head = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });

    if (head.ok) return true;
    if (head.status === 405 || head.status === 403) {
      const get = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
      });
      return get.ok;
    }

    return false;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export function hashSubmissionFingerprint(value: string | null | undefined) {
  const normalized = value?.trim();
  if (!normalized) return null;
  return createHash("sha256").update(normalized).digest("hex");
}

function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (!email || !email.includes("@") || email.startsWith("@") || email.endsWith("@")) {
    throw new Error("Submitter email must be a valid email address.");
  }
  return email;
}

function normalizeTags(input: string[] | null | undefined, title: string, description: string, websiteUrl: string) {
  const explicit = Array.isArray(input)
    ? input.map((tag) => tag.trim().toLowerCase()).filter(Boolean)
    : [];
  const inferred = new Set<string>(explicit);
  const haystack = `${title} ${description} ${websiteUrl}`;

  for (const keyword of TAG_KEYWORDS) {
    if (keyword.pattern.test(haystack)) {
      inferred.add(keyword.tag);
    }
  }

  const domainToken = (() => {
    try {
      const hostname = new URL(websiteUrl).hostname.split(".");
      return hostname.length >= 2 ? hostname[hostname.length - 2] : hostname[0];
    } catch {
      return null;
    }
  })();

  if (domainToken && domainToken.length >= 3) {
    inferred.add(domainToken.toLowerCase());
  }

  return [...inferred].slice(0, 6);
}

function detectSpam(input: SubmissionDraftInput) {
  const text = `${input.title} ${input.summary} ${input.description ?? ""}`;
  const urlCount = (text.match(/https?:\/\//g) ?? []).length;
  if (urlCount >= 3) return "Too many URLs in title or description.";

  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) {
      return "Spam keyword heuristic matched.";
    }
  }

  return null;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(1, Number(value.toFixed(3))));
}

export function screenToolSubmission(
  input: SubmissionDraftInput,
  context: ScreeningContext,
): ScreenedSubmission {
  const websiteUrl = normalizeSubmissionUrl(input.websiteUrl, "Website URL");
  if (!websiteUrl) {
    throw new Error("Website URL is required.");
  }

  const githubUrl = normalizeSubmissionUrl(input.githubUrl ?? "", "GitHub URL");
  const demoUrl = normalizeSubmissionUrl(input.demoUrl ?? "", "Demo URL");
  const docsUrl = normalizeSubmissionUrl(input.docsUrl ?? "", "Docs URL");
  const submitterEmail = normalizeEmail(input.submitterEmail);
  const spamReason = detectSpam(input);
  const description = input.description?.trim() || "";
  const summary = input.summary.trim();
  const slug = slugifyToolSubmission(input.slug?.trim() || input.title);

  if (!input.title.trim() || !summary || !slug) {
    throw new Error("Title and summary are required.");
  }

  const notes: string[] = [];
  let score = 1;
  let status: ToolSubmissionStatus = "approved_for_listing";
  let screeningStatus: SubmissionScreeningStatus = "passed";

  if (spamReason) {
    notes.push(spamReason);
    score = 0.08;
    status = "spam_blocked";
    screeningStatus = "spam_blocked";
  } else {
    if (context.duplicateWebsiteUrl || context.duplicateSlug) {
      notes.push("A similar tool has already been submitted.");
      score -= 0.45;
      status = "screening_failed";
      screeningStatus = "duplicate";
    }

    if (!context.websiteReachable) {
      notes.push("Website did not respond successfully during automated screening.");
      score -= 0.25;
      status = "screening_failed";
      screeningStatus = screeningStatus === "duplicate" ? screeningStatus : "failed";
    } else {
      notes.push("Website reachable.");
    }
  }

  const finalTags = normalizeTags(input.tags, input.title, description, websiteUrl);
  if (finalTags.length === 0) {
    notes.push("No tags inferred; manual review may be helpful.");
    score -= 0.08;
  }

  const sourceLocale = input.sourceLocale?.trim() || DEFAULT_CANONICAL_LOCALE;
  const targetLocales = normalizeLocaleCodes(input.targetLocales ?? DEFAULT_TARGET_LOCALES, sourceLocale);

  return {
    slug,
    summary,
    description,
    websiteUrl,
    githubUrl,
    demoUrl,
    docsUrl,
    tags: finalTags,
    submitterEmail,
    submitterName: input.submitterName?.trim() || null,
    originIpHash: hashSubmissionFingerprint(input.originIp),
    userAgentHash: hashSubmissionFingerprint(input.userAgent),
    sourceLocale,
    targetLocales,
    status,
    screeningStatus,
    screeningScore: clampScore(score),
    screeningNotes: notes,
  };
}
