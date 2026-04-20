/**
 * Pipeline report sender for Telegram.
 * Independent of telegram-orchestrator — this module only formats and sends
 * pipeline run summaries to a configured Telegram chat.
 */

export interface PipelineStageResult {
  id: string;
  label: string;
  status: "idle" | "running" | "done" | "error";
  itemCount?: number;
  durationMs?: number;
  errorMessage?: string;
}

export interface PipelineReport {
  stages: PipelineStageResult[];
  totalDurationMs: number;
  totalItems: number;
  errorCount: number;
  highlights?: string[];
}

export interface DiscoverExportReport {
  vaultRoot: string;
  source: "supabase" | "snapshot" | "mock";
  savedCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  folderCounts: Array<{ folderName: string; count: number }>;
  savedPaths: string[];
  indexPaths?: string[];
  results: Array<{ title: string; status: "created" | "updated" | "skipped" | "failed"; reason?: string }>;
}

const STATUS_EMOJI: Record<string, string> = {
  done: "✅",
  error: "❌",
  running: "⏳",
  idle: "⏳",
};

function formatDuration(ms: number): string {
  return (ms / 1000).toFixed(1) + "초";
}

export function buildReportText(report: PipelineReport): string {
  const lines: string[] = [];

  if (report.errorCount > 0) {
    lines.push("🚨 Pipeline Error");
  } else {
    lines.push("📊 VibeHub Pipeline Report");
  }
  lines.push("━━━━━━━━━━━━━━━━━━");

  for (const stage of report.stages) {
    const emoji = STATUS_EMOJI[stage.status] ?? "⏳";
    let line = `${emoji} ${stage.label}`;
    if (stage.itemCount != null) line += ` — ${stage.itemCount}건`;
    if (stage.durationMs != null) line += ` (${formatDuration(stage.durationMs)})`;
    lines.push(line);

    if (stage.errorMessage) {
      lines.push(`   → ${stage.errorMessage}`);
    }
  }

  if (report.highlights && report.highlights.length > 0) {
    lines.push("━━━━━━━━━━━━━━━━━━");
    lines.push("핵심 알림");

    for (const highlight of report.highlights) {
      lines.push(`- ${highlight}`);
    }
  }

  lines.push("━━━━━━━━━━━━━━━━━━");
  lines.push(`총 ${report.totalItems}건 처리 · ${formatDuration(report.totalDurationMs)} 소요`);

  return lines.join("\n");
}

export function buildDiscoverExportReportText(report: DiscoverExportReport) {
  const lines = ["📚 VibeHub Discover Export", "━━━━━━━━━━━━━━━━━━"];

  lines.push(`저장 ${report.savedCount}개 · 생성 ${report.createdCount} · 갱신 ${report.updatedCount}`);
  lines.push(`건너뜀 ${report.skippedCount}개 · 실패 ${report.failedCount}개`);
  lines.push(`저장 루트: ${report.vaultRoot}`);
  lines.push(`읽기 소스: ${report.source}`);

  if (report.folderCounts.length > 0) {
    lines.push("━━━━━━━━━━━━━━━━━━");
    lines.push("폴더별 저장");

    for (const folder of report.folderCounts) {
      lines.push(`- ${folder.folderName}: ${folder.count}`);
    }
  }

  if (report.savedPaths.length > 0) {
    lines.push("━━━━━━━━━━━━━━━━━━");
    lines.push("저장 경로");

    for (const savedPath of report.savedPaths) {
      lines.push(`- ${savedPath}`);
    }
  }

  if (report.indexPaths && report.indexPaths.length > 0) {
    lines.push("━━━━━━━━━━━━━━━━━━");
    lines.push("인덱스");

    for (const indexPath of report.indexPaths) {
      lines.push(`- ${indexPath}`);
    }
  }

  const failedResults = report.results.filter((result) => result.status === "failed").slice(0, 3);
  if (failedResults.length > 0) {
    lines.push("━━━━━━━━━━━━━━━━━━");
    lines.push("실패 요약");

    for (const result of failedResults) {
      lines.push(`- ${result.title}: ${result.reason ?? "unknown error"}`);
    }
  }

  return lines.join("\n");
}

async function sendTelegramMessage(chatId: string, text: string, botToken: string): Promise<void> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  // Split into 3500-char chunks if needed (Telegram limit is 4096)
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += 3500) {
    chunks.push(text.slice(i, i + 3500));
  }

  for (const chunk of chunks) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: chunk }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Telegram API error: ${res.status} ${err}`);
    }
  }
}

export async function sendPipelineReport(report: PipelineReport): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_REPORT_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("[telegram-report] TELEGRAM_BOT_TOKEN or TELEGRAM_REPORT_CHAT_ID not set, skipping report");
    return;
  }

  const text = buildReportText(report);
  await sendTelegramMessage(chatId, text, botToken);
}

export async function sendDiscoverExportReport(report: DiscoverExportReport): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_REPORT_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("[telegram-report] TELEGRAM_BOT_TOKEN or TELEGRAM_REPORT_CHAT_ID not set, skipping discover export report");
    return;
  }

  const text = buildDiscoverExportReportText(report);
  await sendTelegramMessage(chatId, text, botToken);
}

/* ── Newsletter reports ── */

export interface NewsletterReportInput {
  enCount: number;
  esCount: number;
  briefCount: number;
  error?: string;
}

export function buildNewsletterReportText(input: NewsletterReportInput): string {
  if (input.error) {
    return `🚨 뉴스레터 실패: ${input.error}`;
  }
  if (input.briefCount === 0) {
    return "📧 뉴스레터 스킵 — 오늘 발행 brief 없음";
  }
  return `📧 Daily Brief — EN ${input.enCount}명 / ES ${input.esCount}명 / ${input.briefCount}건 brief`;
}

export async function sendNewsletterReport(input: NewsletterReportInput): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_REPORT_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("[telegram-report] TELEGRAM_BOT_TOKEN or TELEGRAM_REPORT_CHAT_ID not set, skipping newsletter report");
    return;
  }

  const text = buildNewsletterReportText(input);
  await sendTelegramMessage(chatId, text, botToken);
}

/* ── Harness pattern reports ── */

export interface HarnessPatternReport {
  items: Array<{ title: string; slug: string; source?: string }>;
  totalCount: number;
}

export function buildHarnessPatternReportText(report: HarnessPatternReport): string {
  if (report.totalCount === 0) return "";

  const lines = [
    "🔧 새 하네스 후보 발견",
    "━━━━━━━━━━━━━━━━━━",
  ];

  for (const item of report.items.slice(0, 5)) {
    const source = item.source ? ` (${item.source})` : "";
    lines.push(`- ${item.title}${source}`);
  }

  if (report.totalCount > 5) {
    lines.push(`  ...외 ${report.totalCount - 5}건`);
  }

  lines.push("━━━━━━━━━━━━━━━━━━");
  lines.push(`→ ~/jasonob/Radar/Harness Patterns/`);
  lines.push(`총 ${report.totalCount}건 · keep/discard 테스트 필요`);

  return lines.join("\n");
}

export async function sendHarnessPatternReport(report: HarnessPatternReport): Promise<void> {
  if (report.totalCount === 0) return;

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_REPORT_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("[telegram-report] TELEGRAM_BOT_TOKEN or TELEGRAM_REPORT_CHAT_ID not set, skipping harness report");
    return;
  }

  const text = buildHarnessPatternReportText(report);
  await sendTelegramMessage(chatId, text, botToken);
}

export async function sendSubscriberAlert(maskedEmail: string, locale: string, totalCount: number): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_REPORT_CHAT_ID;

  if (!botToken || !chatId) return;

  const text = `📬 새 구독자: ${maskedEmail} (${locale.toUpperCase()} 총 ${totalCount}명)`;
  await sendTelegramMessage(chatId, text, botToken);
}
