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

  lines.push("━━━━━━━━━━━━━━━━━━");
  lines.push(`총 ${report.totalItems}건 처리 · ${formatDuration(report.totalDurationMs)} 소요`);

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
