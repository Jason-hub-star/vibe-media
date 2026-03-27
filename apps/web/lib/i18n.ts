/**
 * i18n utilities — locale 상수, 검증, params 추출.
 * SSOT는 @vibehub/content-contracts의 locales.ts
 */

import {
  DEFAULT_CANONICAL_LOCALE,
  listEnabledLocaleCodes,
} from "@vibehub/content-contracts";

export const SUPPORTED_LOCALES = listEnabledLocaleCodes();
export const DEFAULT_LOCALE = DEFAULT_CANONICAL_LOCALE;

export function isValidLocale(locale: string): boolean {
  return SUPPORTED_LOCALES.includes(locale);
}

export async function getLocaleFromParams(
  params: Promise<{ locale: string }>,
): Promise<string> {
  const { locale } = await params;
  return isValidLocale(locale) ? locale : DEFAULT_LOCALE;
}

/** OG locale 태그 (en_US, es_ES 등) */
export function getOgLocale(locale: string): string {
  const map: Record<string, string> = {
    en: "en_US",
    es: "es_ES",
  };
  return map[locale] ?? "en_US";
}

/** hreflang alternates 객체 빌드 */
export function buildAlternates(
  path: string,
  siteUrl: string,
): Record<string, string> {
  const alternates: Record<string, string> = {};
  for (const locale of SUPPORTED_LOCALES) {
    alternates[locale] = `${siteUrl}/${locale}${path}`;
  }
  return alternates;
}
