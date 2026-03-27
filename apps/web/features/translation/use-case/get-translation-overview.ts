/**
 * 번역 현황 통계 집계.
 */

import { listTranslationStatus } from "../api/list-translation-status";
import type { TranslationStatusRow } from "../api/list-translation-status";

export interface TranslationOverview {
  totalBriefs: number;
  translated: number;
  pending: number;
  qualityFailed: number;
  published: number;
  rows: TranslationStatusRow[];
}

export async function getTranslationOverview(): Promise<TranslationOverview> {
  const rows = await listTranslationStatus();

  // 각 brief의 es variant 기준 통계
  const esVariants = rows.filter((r) => r.locale === "es" && r.translationStatus);
  const uniqueSlugs = new Set(rows.map((r) => r.slug));

  return {
    totalBriefs: uniqueSlugs.size,
    translated: esVariants.filter((r) => r.translationStatus === "translated").length,
    pending: esVariants.filter((r) => r.translationStatus === "pending").length,
    qualityFailed: esVariants.filter((r) => r.translationStatus === "quality_failed").length,
    published: esVariants.filter((r) => r.translationStatus === "published").length,
    rows,
  };
}
