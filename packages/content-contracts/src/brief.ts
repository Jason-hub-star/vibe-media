import type { LocaleCode, TranslationStatus } from "./locales";

export type BriefStatus = "draft" | "review" | "scheduled" | "published";
/** @deprecated Use TranslationStatus from locales.ts */
export type BriefTranslationStatus = TranslationStatus;

export interface BriefLocaleVariant {
  locale: LocaleCode;
  slug: string;
  title: string;
  summary: string;
  status: BriefStatus;
  publishedAt: string | null;
  body?: string[];
  translationStatus?: BriefTranslationStatus;
  isCanonical?: boolean;
}

export interface BriefListItem {
  slug: string;
  title: string;
  summary: string;
  status: BriefStatus;
  publishedAt: string | null;
  sourceCount: number;
  /** Derived: domain names extracted from sourceLinks */
  sourceDomains?: string[];
  /** Derived: estimated read time from body word count */
  readTimeMinutes?: number;
  /** Derived: count of non-empty body array entries */
  bodyElementCount?: number;
  /** Derived: count of public-renderable ## section headings */
  headingCount?: number;
  /** Derived: first ~200 chars of body for hover preview */
  bodyPreview?: string;
  /** Editorial: one-sentence "why it matters" insight (requires DB column) */
  whyItMatters?: string;
  /** Editorial: topic tag for filtering (requires DB column) */
  topic?: string;
  /** Cover image URL from source og:image or enclosure */
  coverImage?: string;
  /** 현재 응답이 대표하는 locale */
  locale?: LocaleCode;
  /** 정본 기준 locale */
  canonicalLocale?: LocaleCode;
  /** 이미 생성된 locale 목록 */
  availableLocales?: LocaleCode[];
  /** 생성 목표 locale 목록 */
  targetLocales?: LocaleCode[];
  /** 현재 locale의 번역/변형 상태 */
  translationStatus?: BriefTranslationStatus;
  /** Connected YouTube watch URL after manual upload completion */
  youtubeUrl?: string;
  /** Canonical YouTube video id */
  youtubeVideoId?: string;
  /** Timestamp when the YouTube link was officially connected */
  youtubeLinkedAt?: string | null;
}

export interface BriefDetail extends BriefListItem {
  body: string[];
  sourceLinks: Array<{
    label: string;
    href: string;
  }>;
  variants?: BriefLocaleVariant[];
}
