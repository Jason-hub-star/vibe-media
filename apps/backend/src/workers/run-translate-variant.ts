/**
 * CLI: tsx run-translate-variant.ts <slug> [--locale=es] [--dry-run] [--discover]
 * brief 또는 discover item을 지정 locale로 번역하여 variant 테이블에 저장.
 *
 * 실패 시 translation_status = 'quality_failed'로 기록하고 영어 발행은 계속 진행.
 */

import { DEFAULT_CANONICAL_LOCALE, listEnabledLocaleCodes } from "@vibehub/content-contracts";
import { getSupabaseBriefDetail, listSupabaseDiscoverItems } from "../shared/supabase-editorial-read";
import { translateBriefVariant } from "../shared/translate-variant";
import { translateDiscoverVariant } from "../shared/translate-discover-variant";
import { saveBriefVariant, saveDiscoverVariant } from "../shared/save-variant";
import { checkVariantQuality } from "../shared/variant-quality-check";
import type { QualityCheckResult } from "../shared/variant-quality-check";
import { createSupabaseSql } from "../shared/supabase-postgres";

// ---------------------------------------------------------------------------
// Telegram 보고
// ---------------------------------------------------------------------------

async function sendTranslationReport(report: {
  slug: string;
  locale: string;
  type: "brief" | "discover";
  success: boolean;
  qualityPassed?: boolean;
  failureCount?: number;
  error?: string;
  dryRun: boolean;
}): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_REPORT_CHAT_ID;
  if (!botToken || !chatId) return;

  const icon = report.success ? (report.qualityPassed ? "🌐" : "⚠️") : "❌";
  const mode = report.dryRun ? " [DRY RUN]" : "";
  const lines = [
    `${icon} Translation${mode}`,
    `━━━━━━━━━━━━━━━━━━`,
    `${report.type === "brief" ? "Brief" : "Discover"}: ${report.slug}`,
    `Locale: ${report.locale}`,
  ];

  if (report.success) {
    lines.push(`Quality: ${report.qualityPassed ? "✅ passed" : `❌ failed (${report.failureCount} issues)`}`);
  } else {
    lines.push(`Error: ${report.error?.slice(0, 200) ?? "unknown"}`);
  }

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: lines.join("\n") }),
    });
  } catch {
    // Telegram 실패는 번역 자체에 영향 없음
  }
}

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
const isDiscover = args.includes("--discover");
const localeArg = args.find((a) => a.startsWith("--locale="))?.split("=")[1] ?? "es";

if (!slug) {
  console.error("usage: tsx run-translate-variant.ts <slug> [--locale=es] [--dry-run] [--discover]");
  process.exit(1);
}

const enabledLocales = listEnabledLocaleCodes();
if (!enabledLocales.includes(localeArg)) {
  console.error(`Invalid locale: "${localeArg}". Supported: ${enabledLocales.join(", ")}`);
  process.exit(1);
}

if (localeArg === DEFAULT_CANONICAL_LOCALE) {
  console.error(`Cannot translate to canonical locale "${localeArg}".`);
  process.exit(1);
}

console.log(`Translating ${isDiscover ? "discover" : "brief"} "${slug}" → ${localeArg}${dryRun ? " [DRY RUN]" : ""}`);

// ---------------------------------------------------------------------------
// Brief 번역
// ---------------------------------------------------------------------------

async function translateBrief() {
  const brief = await getSupabaseBriefDetail(slug!);
  if (!brief) {
    console.error(`Brief not found: ${slug}`);
    process.exit(1);
  }

  // canonical id 조회 (slug → uuid)
  const sql = createSupabaseSql();
  let canonicalId: string;
  try {
    const rows = await sql<Array<{ id: string }>>`
      select id from public.brief_posts where slug = ${slug!} limit 1
    `;
    if (rows.length === 0) {
      console.error(`Brief not found in DB: ${slug}`);
      process.exit(1);
    }
    canonicalId = rows[0].id;
  } finally {
    await sql.end();
  }

  try {
    const result = await translateBriefVariant({
      title: brief.title,
      summary: brief.summary,
      body: brief.body,
      locale: localeArg,
    });

    console.log("\n--- Translation Result ---");
    console.log(`Title: ${result.title}`);
    console.log(`Summary: ${result.summary}`);
    console.log(`Body paragraphs: ${result.body.length}`);

    // 품질 체크
    const quality = checkVariantQuality({
      locale: localeArg,
      title: result.title,
      summary: result.summary,
      body: result.body,
      originalTitle: brief.title,
      originalSummary: brief.summary,
      originalBody: brief.body,
    });

    if (quality.failures.length > 0) {
      console.log("\n--- Quality Check ---");
      for (const f of quality.failures) {
        console.log(`  ${f.severity === "error" ? "❌" : "⚠️"} [${f.rule}] ${f.message}`);
      }
      console.log(`  Result: ${quality.passed ? "PASSED (warnings only)" : "FAILED"}`);
    }

    if (dryRun) {
      console.log("\n[DRY RUN] Skipping DB save.");
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    await saveBriefVariant({
      canonicalId,
      locale: localeArg,
      title: result.title,
      summary: result.summary,
      body: result.body,
      translationStatus: quality.passed ? "translated" : "quality_failed",
      qualityStatus: quality.passed ? "passed" : "failed",
    });

    console.log(`\n✅ Brief variant saved: ${slug} [${localeArg}] (quality: ${quality.passed ? "passed" : "failed"})`);

    await sendTranslationReport({
      slug: slug!, locale: localeArg, type: "brief", success: true,
      qualityPassed: quality.passed, failureCount: quality.failures.length, dryRun,
    });
  } catch (err) {
    console.error(`\n❌ Translation failed:`, err);

    await sendTranslationReport({
      slug: slug!, locale: localeArg, type: "brief", success: false,
      error: err instanceof Error ? err.message : String(err), dryRun,
    });

    if (!dryRun) {
      await saveBriefVariant({
        canonicalId,
        locale: localeArg,
        title: brief.title,
        summary: brief.summary,
        body: brief.body,
        translationStatus: "quality_failed",
      });
      console.log(`Saved as quality_failed — English publishing continues.`);
    }

    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Discover 번역
// ---------------------------------------------------------------------------

async function translateDiscover() {
  const items = await listSupabaseDiscoverItems();
  const item = items?.find((d) => d.slug === slug);
  if (!item) {
    console.error(`Discover item not found: ${slug}`);
    process.exit(1);
  }

  try {
    const result = await translateDiscoverVariant({
      title: item.title,
      summary: item.summary,
      locale: localeArg,
    });

    console.log("\n--- Translation Result ---");
    console.log(`Title: ${result.title}`);
    console.log(`Summary: ${result.summary}`);

    // 품질 체크 (discover는 body 없음 — 빈 배열로 전달)
    const quality = checkVariantQuality({
      locale: localeArg,
      title: result.title,
      summary: result.summary,
      body: [],
      originalTitle: item.title,
      originalSummary: item.summary,
      originalBody: [],
    });

    if (quality.failures.length > 0) {
      console.log("\n--- Quality Check ---");
      for (const f of quality.failures) {
        console.log(`  ${f.severity === "error" ? "❌" : "⚠️"} [${f.rule}] ${f.message}`);
      }
    }

    if (dryRun) {
      console.log("\n[DRY RUN] Skipping DB save.");
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    await saveDiscoverVariant({
      canonicalId: item.id,
      locale: localeArg,
      title: result.title,
      summary: result.summary,
      translationStatus: quality.passed ? "translated" : "quality_failed",
      qualityStatus: quality.passed ? "passed" : "failed",
    });

    console.log(`\n✅ Discover variant saved: ${slug} [${localeArg}] (quality: ${quality.passed ? "passed" : "failed"})`);

    await sendTranslationReport({
      slug: slug!, locale: localeArg, type: "discover", success: true,
      qualityPassed: quality.passed, failureCount: quality.failures.length, dryRun,
    });
  } catch (err) {
    console.error(`\n❌ Translation failed:`, err);

    await sendTranslationReport({
      slug: slug!, locale: localeArg, type: "discover", success: false,
      error: err instanceof Error ? err.message : String(err), dryRun,
    });

    if (!dryRun) {
      await saveDiscoverVariant({
        canonicalId: item.id,
        locale: localeArg,
        title: item.title,
        summary: item.summary,
        translationStatus: "quality_failed",
      });
      console.log(`Saved as quality_failed — English publishing continues.`);
    }

    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// 실행
// ---------------------------------------------------------------------------

if (isDiscover) {
  await translateDiscover();
} else {
  await translateBrief();
}
