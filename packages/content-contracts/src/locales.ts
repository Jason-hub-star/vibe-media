export type LocaleCode = string;

/** Brief/Discover 공용 번역 상태 */
export type TranslationStatus =
  | "canonical"
  | "pending"
  | "translated"
  | "quality_failed"
  | "published";

export interface LocaleDefinition {
  code: LocaleCode;
  label: string;
  englishLabel: string;
  enabled: boolean;
  isDefault?: boolean;
  isDefaultTarget?: boolean;
  audioOverviewSupported?: boolean;
}

export const DEFAULT_LOCALE_REGISTRY: readonly LocaleDefinition[] = [
  {
    code: "en",
    label: "English",
    englishLabel: "English",
    enabled: true,
    isDefault: true,
    isDefaultTarget: true,
    audioOverviewSupported: true,
  },
  {
    code: "es",
    label: "Español",
    englishLabel: "Spanish",
    enabled: true,
    isDefaultTarget: true,
    audioOverviewSupported: true,
  },
] as const;

export const DEFAULT_CANONICAL_LOCALE: LocaleCode =
  DEFAULT_LOCALE_REGISTRY.find((locale) => locale.isDefault)?.code ?? "en";

export const DEFAULT_TARGET_LOCALES: LocaleCode[] = DEFAULT_LOCALE_REGISTRY
  .filter((locale) => locale.enabled && (locale.isDefault || locale.isDefaultTarget))
  .map((locale) => locale.code);

export function getLocaleDefinition(code: LocaleCode): LocaleDefinition | null {
  return DEFAULT_LOCALE_REGISTRY.find((locale) => locale.code === code) ?? null;
}

export function listEnabledLocaleCodes(): LocaleCode[] {
  return DEFAULT_LOCALE_REGISTRY.filter((locale) => locale.enabled).map((locale) => locale.code);
}

export function normalizeLocaleCodes(
  locales: readonly LocaleCode[] | null | undefined,
  fallback: LocaleCode = DEFAULT_CANONICAL_LOCALE,
): LocaleCode[] {
  const values = Array.isArray(locales) ? locales.filter(Boolean) : [];
  const deduped = [...new Set(values)];
  return deduped.length > 0 ? deduped : [fallback];
}
