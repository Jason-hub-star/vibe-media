/**
 * 채널 발행 결과 — DB 저장 + Telegram 보고.
 * 확장성: DispatchResult 인터페이스만 맞추면 어떤 채널이든 동일 처리.
 */

import { createSupabaseSql } from "./supabase-postgres";

// ---------------------------------------------------------------------------
// 타입 (media-engine의 DispatchResult와 동일 구조, 의존성 분리)
// ---------------------------------------------------------------------------

interface ChannelResult {
  channel: string;
  success: boolean;
  publishedUrl?: string;
  error?: string;
  publishedAt?: string;
  crossPromoInjected?: boolean;
  locale?: string;
}

interface DispatchReport {
  briefSlug: string;
  locale?: string;
  results: ChannelResult[];
  crossPromoResults?: ChannelResult[];
  allSuccess: boolean;
  durationMs: number;
  dryRun: boolean;
}

// ---------------------------------------------------------------------------
// DB 저장
// ---------------------------------------------------------------------------

export async function savePublishResults(report: DispatchReport): Promise<void> {
  const sql = createSupabaseSql();

  try {
    // dispatch 배치 기록
    const channels = report.results.map((r) => r.channel);
    await sql`
      insert into public.publish_dispatches
        (brief_slug, channels, all_success, dry_run, duration_ms)
      values
        (${report.briefSlug}, ${channels}, ${report.allSuccess}, ${report.dryRun}, ${report.durationMs})
    `;

    // 채널별 결과 기록 (locale 포함)
    const reportLocale = report.locale ?? "en";
    for (const r of report.results) {
      await sql`
        insert into public.channel_publish_results
          (brief_slug, channel_name, success, published_url, error_message, dry_run, duration_ms, locale)
        values
          (${report.briefSlug}, ${r.channel}, ${r.success}, ${r.publishedUrl ?? null}, ${r.error ?? null}, ${report.dryRun}, ${report.durationMs}, ${r.locale ?? reportLocale})
      `;
    }
  } catch (err) {
    console.error("[channel-publish-report] DB 저장 실패:", err);
  } finally {
    await sql.end();
  }
}

// ---------------------------------------------------------------------------
// Telegram 보고
// ---------------------------------------------------------------------------

function buildChannelPublishText(report: DispatchReport): string {
  const icon = report.allSuccess ? "📢" : "⚠️";
  const mode = report.dryRun ? " [DRY RUN]" : "";
  const localeTag = report.locale && report.locale !== "en" ? ` [${report.locale.toUpperCase()}]` : "";
  const lines: string[] = [
    `${icon} Channel Publish${localeTag}${mode}`,
    `━━━━━━━━━━━━━━━━━━`,
    `Brief: ${report.briefSlug}`,
  ];

  for (const r of report.results) {
    const emoji = r.success ? "✅" : "❌";
    let line = `${emoji} ${r.channel}`;
    if (r.publishedUrl && !r.publishedUrl.startsWith("file://")) {
      line += ` → ${r.publishedUrl}`;
    }
    if (!r.success && r.error) {
      line += ` — ${r.error.slice(0, 100)}`;
    }
    lines.push(line);
  }

  // 크로스프로모 결과
  if (report.crossPromoResults && report.crossPromoResults.length > 0) {
    lines.push(`━━━━━━━━━━━━━━━━━━`);
    lines.push(`Cross-Promo`);
    for (const r of report.crossPromoResults) {
      const emoji = r.success ? "🔗" : "⚠️";
      lines.push(`${emoji} ${r.channel}${r.crossPromoInjected ? " — injected" : ""}`);
    }
  }

  lines.push(`━━━━━━━━━━━━━━━━━━`);

  const successCount = report.results.filter((r) => r.success).length;
  lines.push(`${successCount}/${report.results.length} 성공 · ${(report.durationMs / 1000).toFixed(1)}초`);

  return lines.join("\n");
}

export async function sendChannelPublishReport(report: DispatchReport): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_REPORT_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("[channel-publish-report] TELEGRAM_BOT_TOKEN or TELEGRAM_REPORT_CHAT_ID not set, skipping");
    return;
  }

  const text = buildChannelPublishText(report);

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`[channel-publish-report] Telegram API error: ${res.status} ${err}`);
    }
  } catch (err) {
    console.error("[channel-publish-report] Telegram 전송 실패:", err);
  }
}

// ---------------------------------------------------------------------------
// 통합 — DB 저장 + Telegram 보고 한번에
// ---------------------------------------------------------------------------

export async function reportChannelPublish(report: DispatchReport): Promise<void> {
  await Promise.allSettled([
    savePublishResults(report),
    sendChannelPublishReport(report),
  ]);
}
