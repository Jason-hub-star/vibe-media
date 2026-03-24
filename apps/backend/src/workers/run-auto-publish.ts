import { runAutoPublish } from "../shared/supabase-auto-publish";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const maxBriefs = parseInt(args.find((a) => a.startsWith("--max="))?.split("=")[1] ?? "10", 10);

if (dryRun) {
  console.log("[auto-publish] dry-run mode — DB 업데이트 없음");
}

const report = await runAutoPublish({ dryRun, maxBriefs });

// ─── 결과 출력 ────────────────────────────────────────────────────────────────

console.log(`\n## Auto Publish Report — ${report.ranAt}`);
console.log(`- 대상: ${report.total}건`);
console.log(`- scheduled: ${report.scheduled}건`);
console.log(`- published: ${report.published}건`);
console.log(`- skipped: ${report.skipped}건`);

if (report.results.length > 0) {
  console.log("\n| slug | action | 비고 |");
  console.log("|------|--------|------|");
  for (const r of report.results) {
    const note = r.action === "skipped" ? (r.skipReason ?? "") : "✓ quality pass";
    console.log(`| ${r.slug} | ${r.action} | ${note} |`);
  }
}

// ─── Telegram 보고 ────────────────────────────────────────────────────────────

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_REPORT_CHAT_ID;

if (token && chatId && (report.scheduled > 0 || report.published > 0)) {
  const lines = [
    `[VibeHub] Auto Publish`,
    `- scheduled: ${report.scheduled}건`,
    `- published: ${report.published}건`,
    `- skipped: ${report.skipped}건`,
    ...report.results
      .filter((r) => r.action !== "skipped")
      .map((r) => `  ✓ ${r.slug} → ${r.action}`)
  ];
  const text = lines.join("\n");

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text })
    });
  } catch (err) {
    console.error("[auto-publish] Telegram 전송 실패:", err);
  }
}

// ─── exit code ────────────────────────────────────────────────────────────────

process.exit(0);
