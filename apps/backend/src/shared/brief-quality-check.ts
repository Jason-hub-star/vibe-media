const INTERNAL_TERMS = ["pipeline", "ingest", "classify", "orchestrat"];

export interface BriefQualityInput {
  title: string;
  summary: string;
  body: string[];
  source_links: { label: string; href: string }[];
  source_count: number;
}

export interface BriefQualityResult {
  passed: boolean;
  failures: string[];
  scores: {
    titleLen: number;
    summaryLen: number;
    bodyParagraphs: number;
    sourceCount: number;
  };
}

export function runBriefQualityCheck(brief: BriefQualityInput): BriefQualityResult {
  const failures: string[] = [];

  const titleLen = brief.title?.length ?? 0;
  const summaryLen = brief.summary?.length ?? 0;
  const bodyParagraphs = (brief.body ?? []).filter(
    (line) => !line.startsWith("## ")
  ).length;
  const sourceCount = brief.source_count ?? (brief.source_links ?? []).length;

  if (titleLen < 15 || titleLen > 70) {
    failures.push(`title length ${titleLen} (expected 15-70)`);
  }
  if (summaryLen < 50 || summaryLen > 200) {
    failures.push(`summary length ${summaryLen} (expected 50-200)`);
  }
  if (bodyParagraphs < 3) {
    failures.push(`body paragraphs ${bodyParagraphs} (expected ≥3)`);
  }
  if (sourceCount < 2) {
    failures.push(`source count ${sourceCount} (expected ≥2)`);
  }

  const bodyText = (brief.body ?? []).join(" ").toLowerCase();
  const foundTerms = INTERNAL_TERMS.filter((t) => bodyText.includes(t));
  if (foundTerms.length > 0) {
    failures.push(`internal terms found: ${foundTerms.join(", ")}`);
  }

  const sourceUrls = (brief.source_links ?? []).map((s) => s.href ?? "");
  const badUrls = sourceUrls.filter((u) => !u.startsWith("https://"));
  if (badUrls.length > 0) {
    failures.push(`non-https source URLs: ${badUrls.join(", ")}`);
  }

  return {
    passed: failures.length === 0,
    failures,
    scores: { titleLen, summaryLen, bodyParagraphs, sourceCount }
  };
}
