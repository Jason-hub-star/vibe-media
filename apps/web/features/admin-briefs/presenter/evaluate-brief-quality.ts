import type { BriefDetail } from "@vibehub/content-contracts";

export type QualityStatus = "pass" | "warn" | "fail";

export interface QualityCheck {
  criterion: string;
  status: QualityStatus;
  message: string;
}

const INTERNAL_TERMS = ["pipeline", "ingest", "draft", "classify", "orchestrat"];

export function evaluateBriefQuality(brief: BriefDetail): QualityCheck[] {
  const checks: QualityCheck[] = [];

  // Title length
  const titleLen = brief.title.length;
  if (titleLen >= 15 && titleLen <= 70) {
    checks.push({ criterion: "Title length", status: "pass", message: `${titleLen} chars` });
  } else if ((titleLen >= 10 && titleLen < 15) || (titleLen > 70 && titleLen <= 80)) {
    checks.push({ criterion: "Title length", status: "warn", message: `${titleLen} chars (borderline)` });
  } else {
    checks.push({ criterion: "Title length", status: "fail", message: `${titleLen} chars (out of range)` });
  }

  // Summary length
  const summaryLen = brief.summary.length;
  if (summaryLen >= 50 && summaryLen <= 200) {
    checks.push({ criterion: "Summary length", status: "pass", message: `${summaryLen} chars` });
  } else if ((summaryLen >= 30 && summaryLen < 50) || (summaryLen > 200 && summaryLen <= 250)) {
    checks.push({ criterion: "Summary length", status: "warn", message: `${summaryLen} chars (borderline)` });
  } else {
    checks.push({ criterion: "Summary length", status: "fail", message: `${summaryLen} chars (out of range)` });
  }

  // Body paragraphs
  const bodyCount = brief.body.length;
  if (bodyCount >= 3) {
    checks.push({ criterion: "Body paragraphs", status: "pass", message: `${bodyCount} paragraphs` });
  } else if (bodyCount === 2) {
    checks.push({ criterion: "Body paragraphs", status: "warn", message: "Only 2 paragraphs" });
  } else {
    checks.push({ criterion: "Body paragraphs", status: "fail", message: `${bodyCount} paragraphs (too few)` });
  }

  // Source count
  const srcCount = brief.sourceLinks.length;
  if (srcCount >= 2) {
    checks.push({ criterion: "Source count", status: "pass", message: `${srcCount} sources` });
  } else if (srcCount === 1) {
    checks.push({ criterion: "Source count", status: "warn", message: "Only 1 source" });
  } else {
    checks.push({ criterion: "Source count", status: "fail", message: "No sources" });
  }

  // Source link validity
  const invalidLinks = brief.sourceLinks.filter(
    (l) => !l.href.startsWith("http://") && !l.href.startsWith("https://")
  );
  if (invalidLinks.length === 0) {
    checks.push({ criterion: "Source URLs", status: "pass", message: "All HTTP(S)" });
  } else {
    checks.push({ criterion: "Source URLs", status: "fail", message: `${invalidLinks.length} non-HTTP link(s)` });
  }

  // Internal term leak
  const fullText = `${brief.title} ${brief.summary} ${brief.body.join(" ")}`.toLowerCase();
  const leaked = INTERNAL_TERMS.filter((term) => fullText.includes(term));
  if (leaked.length === 0) {
    checks.push({ criterion: "Internal terms", status: "pass", message: "None detected" });
  } else {
    checks.push({ criterion: "Internal terms", status: "fail", message: `Found: ${leaked.join(", ")}` });
  }

  return checks;
}
