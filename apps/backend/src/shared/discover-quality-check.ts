/**
 * Discover Item Quality Gate
 *
 * Brief와 달리 body가 없는 Discover는 title + summary만으로 판단한다.
 * RSS description 잘림, 인용구 복붙 등 부실 summary를 걸러낸다.
 */

export interface DiscoverQualityInput {
  title: string;
  summary: string;
  category: string;
}

export interface DiscoverQualityResult {
  passed: boolean;
  failures: string[];
}

/** summary가 잘린 텍스트인지 ("..." 또는 "…"로 끝남) */
function isTruncated(text: string): boolean {
  const trimmed = text.trimEnd();
  return trimmed.endsWith("...") || trimmed.endsWith("…");
}

/** summary가 인용구로 시작하는지 (본문 설명이 아니라 인용 복붙) */
function startsWithQuote(text: string): boolean {
  const trimmed = text.trimStart();
  return /^[""\u201C\u201D\u2018\u2019'«»]/.test(trimmed);
}

/** summary에 실질적 설명이 포함되어 있는지 (인용 부분 제거 후 판단) */
function hasSubstantiveContent(text: string): boolean {
  // 인용구 영역 제거: "..." 또는 "..." 패턴
  const withoutQuotes = text.replace(/[""\u201C\u201D][^""\u201C\u201D]*[""\u201C\u201D]/g, "").trim();
  // 출처 표기 제거: — Author Name 패턴
  const withoutAttribution = withoutQuotes.replace(/[—–-]\s*[A-Z][^\n]*/g, "").trim();
  return withoutAttribution.length >= 40;
}

export function runDiscoverQualityCheck(input: DiscoverQualityInput): DiscoverQualityResult {
  const failures: string[] = [];

  const titleLen = input.title?.length ?? 0;
  const summaryLen = input.summary?.length ?? 0;

  // title 길이
  if (titleLen < 10 || titleLen > 120) {
    failures.push(`title length ${titleLen} (expected 10-120)`);
  }

  // summary 길이 — 60자 미만은 의미 있는 설명 불가
  if (summaryLen < 60) {
    failures.push(`summary too short: ${summaryLen} chars (expected ≥60)`);
  }

  // summary가 잘림 텍스트 ("..."로 끝남) — 120자+ 이면 clampText 자른 것이므로 허용
  if (isTruncated(input.summary) && summaryLen < 120) {
    failures.push("summary is truncated (ends with '...')");
  }

  // summary가 인용구로 시작 + 실질 내용 부족
  if (startsWithQuote(input.summary) && !hasSubstantiveContent(input.summary)) {
    failures.push("summary starts with a quote and lacks substantive description");
  }

  // 내부 용어 누출
  const internalTerms = ["pipeline", "ingest", "classify", "orchestrat"];
  const summaryLower = (input.summary ?? "").toLowerCase();
  const foundTerms = internalTerms.filter((t) => summaryLower.includes(t));
  if (foundTerms.length > 0) {
    failures.push(`internal terms in summary: ${foundTerms.join(", ")}`);
  }

  return { passed: failures.length === 0, failures };
}
