/**
 * Channel Publish Pipeline — 채널별 발행 타입 확장.
 * 기존 types.ts의 PublishTarget/PublishResult를 extends.
 */

import type { LocaleCode } from "@vibehub/content-contracts";
import type { PublishPayload, PublishResult, PublishTarget } from "../types";

export type { LocaleCode };

// ---------------------------------------------------------------------------
// Channel 식별
// ---------------------------------------------------------------------------

/** 지원 채널 목록 (확장 가능) */
export type ChannelName =
  | "threads"
  | "ghost"
  | "tistory"
  | "spotify"
  | "youtube"
  | "podcast-rss"
  | "x"
  | "instagram"
  | "linkedin";

/** 채널 활성화 상태 */
export interface ChannelConfig {
  name: ChannelName;
  enabled: boolean;
  /** dryRun이면 실제 발행 안 함 */
  dryRun?: boolean;
}

// ---------------------------------------------------------------------------
// 발행 결과 확장
// ---------------------------------------------------------------------------

/** 채널별 발행 결과 (채널 이름 포함) */
export interface ChannelPublishResult extends PublishResult {
  channel: ChannelName;
  /** 발행 시각 (ISO) */
  publishedAt?: string;
  /** Pass 2에서 크로스프로모 주입 성공 여부 */
  crossPromoInjected?: boolean;
}

/** Dispatcher 전체 결과 */
export interface DispatchResult {
  briefId: string;
  results: ChannelPublishResult[];
  /** 전체 성공 여부 (하나라도 실패하면 false) */
  allSuccess: boolean;
  /** Pass 2 크로스프로모 결과 */
  crossPromoResults?: ChannelPublishResult[];
  /** 소요 시간 (ms) */
  durationMs: number;
}

// ---------------------------------------------------------------------------
// 크로스 프로모션
// ---------------------------------------------------------------------------

/** 크로스 프로모션 블록 — 다른 채널로의 링크 */
export interface CrossPromoBlock {
  /** 링크 대상 채널 */
  targetChannel: ChannelName;
  /** 발행된 URL */
  url: string;
  /** 프로모션 텍스트 */
  text: string;
}

/** 크로스 프로모션 결과 */
export interface CrossPromoResult {
  channel: ChannelName;
  success: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Brief 발행 메타데이터
// ---------------------------------------------------------------------------

/** 브리프의 채널 발행 메타데이터 (DB brief_channel_meta JSONB 필드용) */
export interface BriefChannelVariantMeta {
  locale: LocaleCode;
  title: string;
  markdownBody: string;
  htmlBody?: string;
  tags?: string[];
  coverImageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  subtitlePath?: string;
  publishedAt?: string;
}

export interface BriefChannelMeta {
  briefId: string;
  slug: string;
  title: string;
  /** 본문 (마크다운) */
  markdownBody: string;
  /** 본문 (HTML) */
  htmlBody?: string;
  /** 태그 */
  tags: string[];
  /** 커버 이미지 URL */
  coverImageUrl?: string;
  /** 오디오 URL (NotebookLM M4A) */
  audioUrl?: string;
  /** 비디오 URL (Audiogram MP4) */
  videoUrls?: Record<string, string>;
  /** 썸네일 URL */
  thumbnailUrls?: Record<string, string>;
  /** 자막 SRT 경로 */
  subtitlePaths?: Record<string, string>;
  /** 채널별 발행 URL */
  publishedUrls?: Partial<Record<ChannelName, string>>;
  /** 발행 일시 */
  publishedAt?: string;
  /** 현재 생성된 locale 목록 (legacy alias: languages) */
  languages: string[];
  canonicalLocale?: LocaleCode;
  defaultLocale?: LocaleCode;
  availableLocales?: LocaleCode[];
  targetLocales?: LocaleCode[];
  variants?: Partial<Record<LocaleCode, BriefChannelVariantMeta>>;
}

export function getPrimaryLocale(meta: BriefChannelMeta): LocaleCode {
  return (
    meta.defaultLocale ??
    meta.canonicalLocale ??
    meta.availableLocales?.[0] ??
    meta.languages[0] ??
    "en"
  );
}

export function getVariantForLocale(
  meta: BriefChannelMeta,
  locale: LocaleCode = getPrimaryLocale(meta),
): BriefChannelVariantMeta | null {
  return meta.variants?.[locale] ?? null;
}

// ---------------------------------------------------------------------------
// Publisher 인터페이스 확장
// ---------------------------------------------------------------------------

/** 채널 Publisher — PublishTarget을 확장하여 채널명과 dryRun 지원 */
export interface ChannelPublisher extends PublishTarget {
  channel: ChannelName;
  /** dryRun: true면 실제 API 호출 없이 결과만 반환 */
  publish(payload: PublishPayload, options?: { dryRun?: boolean }): Promise<ChannelPublishResult>;
  /** 크로스프로모 답글/업데이트 (Pass 2) */
  injectCrossPromo?(
    publishedUrl: string,
    promos: CrossPromoBlock[],
  ): Promise<CrossPromoResult>;
}

// ---------------------------------------------------------------------------
// Dispatcher 옵션
// ---------------------------------------------------------------------------

export interface PublishDispatchOptions {
  briefMeta: BriefChannelMeta;
  channels: ChannelConfig[];
  dryRun?: boolean;
  /** YouTube video ID (Pass 3에서 수동 등록 시) */
  youtubeVideoId?: string;
  /** Pass 2 크로스프로모 건너뛰기 (기본: false). Threads 전파 지연 대응용. */
  skipCrossPromo?: boolean;
}
