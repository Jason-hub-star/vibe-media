import { briefContainsHangulContent } from "./brief-language";
import { isValidCoverImageUrl } from "./image-url-validator";

const INTERNAL_TERMS = ["pipeline", "ingest", "classify", "orchestrat"];
const ARTIFACT_RULES = [
  { label: "Summary:", pattern: /\bsummary:/i },
  { label: "Listen to article", pattern: /listen to article/i },
  { label: "Announcements", pattern: /\bannouncements\b/i },
  { label: "Play episode", pattern: /play episode/i },
];
const MARKETING_RULES = [
  { label: "excited to announce", pattern: /\b(excited|proud|pleased|happy)\s+to\s+announce\b/i },
  { label: "originally published on", pattern: /originally published on/i },
];
const EXPLAINER_RULES = [
  { label: "glossary or definition topic", pattern: /\b(glossary|definition)\b/i },
  { label: "what is explainer", pattern: /\bwhat is\b/i },
  { label: "how to explainer", pattern: /\bhow to\b/i },
];
const CHANGELOG_RULES = [
  { label: "release notes or changelog", pattern: /\b(release notes?|changelog)\b/i },
  { label: "maintenance release", pattern: /\bmaintenance release\b/i },
  { label: "updated dependencies", pattern: /\bupdated dependencies\b/i },
];
const AUDIENCE_SIGNAL_PATTERN =
  /\b(developers?|teams?|customers?|users?|companies?|startups?|enterprises?|admins?|operators?|buyers?|creators?|organizations?)\b/i;
const IMPACT_SIGNAL_PATTERN =
  /\b(matters?|means?|could|may|helps?|reduces?|improves?|changes?|affects?|raises?|lowers?|speeds?|slows?|risk|cost|pricing|access|adoption|workflow|compliance|governance|competition|market|deployment|rollout|operations?)\b/i;

export interface BriefQualityInput {
  title: string;
  summary: string;
  body: string[];
  source_links: { label: string; href: string }[];
  source_count: number;
  cover_image_url?: string | null;
}

export interface BriefQualityResult {
  passed: boolean;
  failures: string[];
  /** 0~100 종합 품질 점수 */
  qualityScore: number;
  /** 등급: A(≥85) B(≥70) C(≥55) D(≥40) F(<40) */
  grade: "A" | "B" | "C" | "D" | "F";
  scores: {
    titleLen: number;
    summaryLen: number;
    bodyParagraphs: number;
    sourceCount: number;
    /** 확장 점수 항목 */
    titleAppeal: number;       // 0~10: 의문문/숫자/행동동사 보너스
    summaryStandalone: number; // 0~10: summary만으로 핵심 전달
    structureScore: number;    // 0~10: 섹션 헤딩 + 단락 균형
    sourceDiversity: number;   // 0~10: 도메인 다양성
    readability: number;       // 0~10: 전문용어 비율 낮을수록 높음
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function scoreTitleAppeal(title: string): number {
  let score = 5;
  if (/[?？]/.test(title)) score += 2;                    // 의문문
  if (/\d/.test(title)) score += 1;                        // 숫자 포함
  if (/^(How|Why|What|When|어떻게|왜|무엇)/.test(title)) score += 2; // 행동 유도
  if (title.length >= 20 && title.length <= 55) score += 1; // 적정 길이 보너스
  if (/[—:–]/.test(title)) score += 1;                    // 구분자 사용
  return clamp(score, 0, 10);
}

function scoreSummaryStandalone(summary: string): number {
  let score = 5;
  const len = summary.length;
  if (len >= 80 && len <= 160) score += 2;     // 적정 길이
  if (/\.$|다\.$|요\.$/.test(summary)) score += 1; // 완결된 문장
  if (summary.split(/[.。]/).filter(Boolean).length >= 2) score += 2; // 2문장 이상
  return clamp(score, 0, 10);
}

function scoreStructure(body: string[]): number {
  let score = 5;
  const headings = body.filter((line) => line.startsWith("## ")).length;
  const paragraphs = body.filter((line) => !line.startsWith("## ") && line.trim().length > 0).length;
  if (headings >= 2) score += 3;               // 섹션 구분 있음
  else if (headings === 1) score += 1;
  if (paragraphs >= 4) score += 2;             // 충분한 분량
  if (paragraphs >= 6) score += 1;             // 풍부한 분량
  return clamp(score, 0, 10);
}

function scoreSourceDiversity(links: { label: string; href: string }[]): number {
  const domains = new Set(
    links.map((l) => {
      try { return new URL(l.href).hostname.replace(/^www\./, ""); }
      catch { return "unknown"; }
    })
  );
  if (domains.size >= 3) return 10;
  if (domains.size === 2) return 7;
  if (domains.size === 1) return 4;
  return 0;
}

function scoreReadability(body: string[]): number {
  const text = body.join(" ").toLowerCase();
  const words = text.split(/\s+/).length;
  if (words === 0) return 0;

  const techTerms = [
    "api", "sdk", "llm", "gpu", "cpu", "ml", "nlp", "rag", "fine-tun",
    "inference", "embedding", "tokeniz", "latency", "throughput", "benchmark"
  ];
  const techCount = techTerms.reduce((n, t) => n + (text.includes(t) ? 1 : 0), 0);
  const ratio = techCount / Math.max(words / 50, 1); // 50단어당 전문용어 수

  if (ratio <= 1) return 10;     // 전문용어 적음 → 독자 친화
  if (ratio <= 2) return 7;
  if (ratio <= 3) return 5;
  return 3;                       // 전문용어 과다
}

function computeGrade(score: number): BriefQualityResult["grade"] {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

function hasReaderFacingAngle(body: string[]) {
  return body.some((line) => {
    const trimmed = line.trim();
    return (
      /why it matters/i.test(trimmed) ||
      (trimmed.length >= 80 &&
        AUDIENCE_SIGNAL_PATTERN.test(trimmed) &&
        IMPACT_SIGNAL_PATTERN.test(trimmed))
    );
  });
}

export function runBriefQualityCheck(brief: BriefQualityInput): BriefQualityResult {
  const failures: string[] = [];

  const titleLen = brief.title?.length ?? 0;
  const summaryLen = brief.summary?.length ?? 0;
  const bodyParagraphs = (brief.body ?? []).filter(
    (line) => !line.startsWith("## ")
  ).length;
  const sourceCount = brief.source_count ?? (brief.source_links ?? []).length;

  // --- 기존 pass/fail 게이트 (하위호환) ---
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

  if (briefContainsHangulContent({
    title: brief.title ?? "",
    summary: brief.summary ?? "",
    body: brief.body ?? [],
  })) {
    failures.push("canonical brief must be in English only");
  }

  const combinedText = `${brief.title ?? ""}\n${brief.summary ?? ""}\n${(brief.body ?? []).join(" ")}`;
  const combinedLower = combinedText.toLowerCase();
  const titleSummaryText = `${brief.title ?? ""}\n${brief.summary ?? ""}`;
  const foundTerms = INTERNAL_TERMS.filter((t) => combinedLower.includes(t));
  if (foundTerms.length > 0) {
    failures.push(`internal terms found: ${foundTerms.join(", ")}`);
  }

  const foundArtifacts = ARTIFACT_RULES.filter((rule) => rule.pattern.test(combinedText)).map(
    (rule) => rule.label
  );
  if (foundArtifacts.length > 0) {
    failures.push(`artifact text found: ${foundArtifacts.join(", ")}`);
  }

  const foundMarketing = MARKETING_RULES.filter((rule) => rule.pattern.test(combinedText)).map(
    (rule) => rule.label
  );
  if (foundMarketing.length > 0) {
    failures.push(`marketing boilerplate found: ${foundMarketing.join(", ")}`);
  }

  const foundExplainers = EXPLAINER_RULES.filter((rule) => rule.pattern.test(titleSummaryText)).map(
    (rule) => rule.label
  );
  if (foundExplainers.length > 0) {
    failures.push(`low-value topic pattern found: ${foundExplainers.join(", ")}`);
  }

  const readerFacingAngle = hasReaderFacingAngle(brief.body ?? []);
  const foundChangelogPatterns = CHANGELOG_RULES.filter((rule) => rule.pattern.test(titleSummaryText)).map(
    (rule) => rule.label
  );
  if (foundChangelogPatterns.length > 0 && !readerFacingAngle) {
    failures.push(`low-value changelog pattern found without reader angle: ${foundChangelogPatterns.join(", ")}`);
  }

  if (!readerFacingAngle) {
    failures.push("missing reader-facing angle for why this matters to readers");
  }

  const sourceUrls = (brief.source_links ?? []).map((s) => s.href ?? "");
  const badUrls = sourceUrls.filter((u) => !u.startsWith("https://"));
  if (badUrls.length > 0) {
    failures.push(`non-https source URLs: ${badUrls.join(", ")}`);
  }

  if (brief.cover_image_url && !isValidCoverImageUrl(brief.cover_image_url)) {
    failures.push("cover image failed publisher-quality validation");
  }

  // --- 본문 없음 즉시 실패 (F등급 강제) ---
  const bodyEmpty = bodyParagraphs === 0;
  if (bodyEmpty) {
    failures.push("body is empty — cannot publish without substantive content");
  }

  // --- 확장 점수 계산 (0~100) ---
  const titleAppeal = scoreTitleAppeal(brief.title ?? "");
  const summaryStandalone = scoreSummaryStandalone(brief.summary ?? "");
  const structureScore = scoreStructure(brief.body ?? []);
  const sourceDiversity = scoreSourceDiversity(brief.source_links ?? []);
  const readability = scoreReadability(brief.body ?? []);

  // 기본 게이트 점수 (50점 만점)
  let gateScore = 0;
  if (titleLen >= 15 && titleLen <= 70) gateScore += 10;
  if (summaryLen >= 50 && summaryLen <= 200) gateScore += 10;
  if (bodyParagraphs >= 3) gateScore += 10;
  if (sourceCount >= 2) gateScore += 10;
  if (foundTerms.length === 0) gateScore += 5;
  if (badUrls.length === 0) gateScore += 5;

  // 확장 점수 (50점 만점)
  const extendedScore = titleAppeal + summaryStandalone + structureScore + sourceDiversity + readability;

  // 본문 없으면 최대 25점 (F등급 확정) — summary만으로는 brief 발행 불가
  const rawScore = gateScore + extendedScore;
  const qualityScore = clamp(bodyEmpty ? Math.min(rawScore, 25) : rawScore, 0, 100);
  const grade = computeGrade(qualityScore);

  return {
    passed: failures.length === 0,
    failures,
    qualityScore,
    grade,
    scores: {
      titleLen,
      summaryLen,
      bodyParagraphs,
      sourceCount,
      titleAppeal,
      summaryStandalone,
      structureScore,
      sourceDiversity,
      readability
    }
  };
}
