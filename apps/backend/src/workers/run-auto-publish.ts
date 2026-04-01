import { runAutoPublish } from "../shared/supabase-auto-publish";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const maxBriefs = parseInt(args.find((a) => a.startsWith("--max="))?.split("=")[1] ?? "5", 10);

// 일일 발행 상한: --daily-limit=N > DAILY_PUBLISH_LIMIT 환경변수 > 기본값 5
const dailyLimitArg = args.find((a) => a.startsWith("--daily-limit="))?.split("=")[1];
const dailyLimit = parseInt(dailyLimitArg ?? process.env.DAILY_PUBLISH_LIMIT ?? "5", 10);

if (dryRun) {
  console.log("[auto-publish] dry-run mode — DB 업데이트 없음");
}
console.log(`[auto-publish] 일일 발행 상한: ${dailyLimit}건 / 회당 최대: ${maxBriefs}건`);

const report = await runAutoPublish({ dryRun, maxBriefs, dailyLimit });

// ─── 결과 출력 ────────────────────────────────────────────────────────────────

console.log(`\n## Auto Publish Report — ${report.ranAt}`);
if (report.dailyLimitHit) {
  console.log(`- ⚠️  일일 상한 도달 (오늘 이미 ${report.alreadyPublishedToday}/${dailyLimit}건 발행됨) — 추가 발행 없음`);
} else {
  console.log(`- 오늘 기발행: ${report.alreadyPublishedToday ?? 0}건 / 일일 상한: ${dailyLimit}건`);
  console.log(`- 대상: ${report.total}건`);
  console.log(`- scheduled: ${report.scheduled}건`);
  console.log(`- published: ${report.published}건`);
  console.log(`- skipped: ${report.skipped}건`);
}

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
