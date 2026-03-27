/**
 * Locale-specific publish helpers — locale별 payload 빌더, 크로스프로모 locale 템플릿.
 */

import type { LocaleCode } from "@vibehub/content-contracts";
import type { BriefChannelMeta, BriefChannelVariantMeta, ChannelName, CrossPromoBlock } from "./channel-types";
import { getVariantForLocale } from "./channel-types";
import { SITE_URL } from "../brand";

// ---------------------------------------------------------------------------
// Locale별 크로스프로모 템플릿
// ---------------------------------------------------------------------------

interface LocalePromoTemplate {
  /** 다른 locale 링크 안내 텍스트 */
  crossLocaleText: (targetLocale: LocaleCode, slug: string) => string;
  /** 다른 locale 존재 알림 텍스트 */
  alsoAvailableText: (targetLocale: LocaleCode) => string;
}

const LOCALE_PROMO_TEMPLATES: Record<string, LocalePromoTemplate> = {
  en: {
    crossLocaleText: (targetLocale, slug) =>
      targetLocale === "es"
        ? `🇪🇸 También disponible en español: ${SITE_URL}/es/brief/${slug}`
        : `🌐 Also available in ${targetLocale}: ${SITE_URL}/${targetLocale}/brief/${slug}`,
    alsoAvailableText: (targetLocale) =>
      targetLocale === "es" ? "🇪🇸 Lee en español" : `🌐 Read in ${targetLocale}`,
  },
  es: {
    crossLocaleText: (_targetLocale, slug) =>
      `🇺🇸 Also available in English: ${SITE_URL}/en/brief/${slug}`,
    alsoAvailableText: () => "🇺🇸 Also available in English",
  },
};

/**
 * locale 크로스프로모 텍스트 생성.
 * Threads 답글/YouTube 설명에 삽입할 다른 locale 링크.
 */
export function buildLocaleCrossPromoText(
  fromLocale: LocaleCode,
  targetLocales: LocaleCode[],
  slug: string,
): string {
  const template = LOCALE_PROMO_TEMPLATES[fromLocale] ?? LOCALE_PROMO_TEMPLATES.en!;
  const otherLocales = targetLocales.filter((l) => l !== fromLocale);

  return otherLocales
    .map((locale) => template.crossLocaleText(locale, slug))
    .join("\n");
}

/**
 * YouTube 설명에 다른 locale 링크 포함.
 */
export function appendLocaleLinksToDescription(
  description: string,
  fromLocale: LocaleCode,
  allLocales: LocaleCode[],
  slug: string,
): string {
  const crossPromo = buildLocaleCrossPromoText(fromLocale, allLocales, slug);
  if (!crossPromo) return description;
  return `${description}\n\n---\n${crossPromo}`;
}

// ---------------------------------------------------------------------------
// Locale별 playlist 이름
// ---------------------------------------------------------------------------

const LOCALE_PLAYLIST_NAMES: Record<string, string> = {
  en: "VibeHub — AI Daily Brief",
  es: "VibeHub — Resumen Diario de IA",
};

export function getPlaylistName(locale: LocaleCode): string {
  return LOCALE_PLAYLIST_NAMES[locale] ?? LOCALE_PLAYLIST_NAMES.en!;
}
