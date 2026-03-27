/**
 * Locale-specific quality gates for translated variants.
 * 스페인어 전용 품질 체크 — 영어 규칙 복붙이 아님.
 */

import type { LocaleCode } from "@vibehub/content-contracts";

// ---------------------------------------------------------------------------
// 품질 검사 결과
// ---------------------------------------------------------------------------

export interface QualityCheckResult {
  passed: boolean;
  failures: QualityFailure[];
  locale: LocaleCode;
}

export interface QualityFailure {
  rule: string;
  message: string;
  severity: "error" | "warning";
}

// ---------------------------------------------------------------------------
// Locale별 설정
// ---------------------------------------------------------------------------

interface LocaleQualityConfig {
  titleMin: number;
  titleMax: number;
  summaryMin: number;
  summaryMax: number;
  /** 최소 악센트 문자 수 (본문 200자 이상일 때) */
  minAccentChars: number;
  /** 연속 영단어 상한 (미번역 감지) */
  maxConsecutiveEnglishWords: number;
  /** 단락 수 비율 허용 범위 [min, max] (원본 대비) */
  paragraphCountRatio: [number, number];
}

const LOCALE_QUALITY_CONFIG: Record<string, LocaleQualityConfig> = {
  es: {
    titleMin: 15,
    titleMax: 80,
    summaryMin: 50,
    summaryMax: 250,
    minAccentChars: 1,
    maxConsecutiveEnglishWords: 10,
    paragraphCountRatio: [0.8, 1.2],
  },
};

// ---------------------------------------------------------------------------
// 개별 체크 함수
// ---------------------------------------------------------------------------

function checkTitleLength(
  title: string,
  config: LocaleQualityConfig,
): QualityFailure | null {
  if (title.length < config.titleMin) {
    return { rule: "title_too_short", message: `Title ${title.length}자 < 최소 ${config.titleMin}자`, severity: "error" };
  }
  if (title.length > config.titleMax) {
    return { rule: "title_too_long", message: `Title ${title.length}자 > 최대 ${config.titleMax}자`, severity: "error" };
  }
  return null;
}

function checkSummaryLength(
  summary: string,
  config: LocaleQualityConfig,
): QualityFailure | null {
  if (summary.length < config.summaryMin) {
    return { rule: "summary_too_short", message: `Summary ${summary.length}자 < 최소 ${config.summaryMin}자`, severity: "error" };
  }
  if (summary.length > config.summaryMax) {
    return { rule: "summary_too_long", message: `Summary ${summary.length}자 > 최대 ${config.summaryMax}자`, severity: "warning" };
  }
  return null;
}

/**
 * 스페인어 악센트 검증 — 본문 200자 이상인데 á/é/í/ó/ú/ñ/ü 0개면 플래그.
 */
function checkAccentPresence(
  body: string[],
  config: LocaleQualityConfig,
): QualityFailure | null {
  const fullText = body.join(" ");
  if (fullText.length < 200) return null;

  const accentCount = (fullText.match(/[áéíóúñü]/gi) ?? []).length;
  if (accentCount < config.minAccentChars) {
    return {
      rule: "missing_accents",
      message: `본문 ${fullText.length}자인데 스페인어 악센트 문자 ${accentCount}개 — 미번역 의심`,
      severity: "error",
    };
  }
  return null;
}

/**
 * 미번역 영어 문장 감지 — N개 이상 연속 영단어가 있으면 플래그.
 */
function checkUntranslatedSegments(
  body: string[],
  config: LocaleQualityConfig,
): QualityFailure | null {
  const fullText = body.join(" ");
  // 영단어만으로 이루어진 연속 시퀀스 찾기 (고유명사 제외를 위해 소문자만)
  const words = fullText.split(/\s+/);
  let consecutiveEnglish = 0;
  let maxRun = 0;

  for (const word of words) {
    // 순수 영어 단어 (소문자, 구두점 제거) — 대문자 시작 고유명사는 제외
    const clean = word.replace(/[^a-zA-Z]/g, "");
    if (clean.length >= 3 && clean === clean.toLowerCase() && /^[a-z]+$/.test(clean)) {
      consecutiveEnglish++;
      maxRun = Math.max(maxRun, consecutiveEnglish);
    } else {
      consecutiveEnglish = 0;
    }
  }

  if (maxRun >= config.maxConsecutiveEnglishWords) {
    return {
      rule: "untranslated_segment",
      message: `${maxRun}개 연속 영단어 감지 — 미번역 구간 존재`,
      severity: "error",
    };
  }
  return null;
}

/**
 * 반복 3-gram 감지 — 기계번역 아티팩트.
 */
function checkRepeating3grams(body: string[]): QualityFailure | null {
  const fullText = body.join(" ");
  const words = fullText.split(/\s+/).map((w) => w.toLowerCase().replace(/[^a-záéíóúñü]/gi, ""));
  const trigrams = new Map<string, number>();

  for (let i = 0; i < words.length - 2; i++) {
    const gram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
    if (gram.trim().length < 6) continue;
    trigrams.set(gram, (trigrams.get(gram) ?? 0) + 1);
  }

  const maxRepeat = Math.max(0, ...trigrams.values());
  if (maxRepeat >= 4) {
    const repeatedGram = [...trigrams.entries()].find(([, c]) => c === maxRepeat)?.[0];
    return {
      rule: "repeating_3gram",
      message: `3-gram "${repeatedGram}" ${maxRepeat}회 반복 — 기계번역 아티팩트 의심`,
      severity: "warning",
    };
  }
  return null;
}

/**
 * 고유명사 보존 체크 — 영어 원문의 대문자 복합어가 번역에도 존재하는지.
 */
function checkProperNounPreservation(
  originalBody: string[],
  translatedBody: string[],
): QualityFailure | null {
  const originalText = originalBody.join(" ");
  const translatedText = translatedBody.join(" ");

  // 2단어 이상 대문자 시작 복합어 추출 (e.g. "Google DeepMind", "Open AI")
  const properNouns = new Set<string>();
  const matches = originalText.match(/(?:[A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)+)/g);
  if (matches) {
    for (const m of matches) properNouns.add(m);
  }

  const missing: string[] = [];
  for (const noun of properNouns) {
    if (!translatedText.includes(noun)) {
      missing.push(noun);
    }
  }

  if (missing.length > 0) {
    return {
      rule: "proper_noun_missing",
      message: `고유명사 누락: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? ` 외 ${missing.length - 5}개` : ""}`,
      severity: "warning",
    };
  }
  return null;
}

/**
 * 단락 수 비율 체크 — 영어 대비 80%-120% 범위.
 */
function checkParagraphCount(
  originalBody: string[],
  translatedBody: string[],
  config: LocaleQualityConfig,
): QualityFailure | null {
  if (originalBody.length === 0) return null;

  const ratio = translatedBody.length / originalBody.length;
  const [min, max] = config.paragraphCountRatio;

  if (ratio < min || ratio > max) {
    return {
      rule: "paragraph_count_mismatch",
      message: `단락 수 원본 ${originalBody.length}개 → 번역 ${translatedBody.length}개 (비율 ${(ratio * 100).toFixed(0)}%)`,
      severity: "error",
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// 메인 품질 검사
// ---------------------------------------------------------------------------

export interface VariantQualityInput {
  locale: LocaleCode;
  title: string;
  summary: string;
  body: string[];
  originalTitle: string;
  originalSummary: string;
  originalBody: string[];
}

export function checkVariantQuality(input: VariantQualityInput): QualityCheckResult {
  const config = LOCALE_QUALITY_CONFIG[input.locale];
  if (!config) {
    return { passed: true, failures: [], locale: input.locale };
  }

  const failures: QualityFailure[] = [];

  const checks = [
    checkTitleLength(input.title, config),
    checkSummaryLength(input.summary, config),
    checkAccentPresence(input.body, config),
    checkUntranslatedSegments(input.body, config),
    checkRepeating3grams(input.body),
    checkProperNounPreservation(input.originalBody, input.body),
    checkParagraphCount(input.originalBody, input.body, config),
  ];

  for (const result of checks) {
    if (result) failures.push(result);
  }

  const hasErrors = failures.some((f) => f.severity === "error");
  return { passed: !hasErrors, failures, locale: input.locale };
}
