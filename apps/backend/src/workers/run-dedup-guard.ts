import { runDedupGuard, buildDedupReportText } from "../shared/supabase-dedup-guard";

const report = await runDedupGuard();

console.log(`\n## Dedup Guard — ${report.ranAt}`);
console.log(`- 검사 대상: ${report.checked}건`);
console.log(`- 중복 감지: ${report.duplicates}건`);
console.log(`- 동일 소스 중복: ${report.sameSourceDuplicates}건`);

if (report.matches.length > 0) {
  console.log("\n| 신규 slug | 기존 slug | 유사도 | 유형 |");
  console.log("|----------|----------|--------|------|");
  for (const match of report.matches) {
    console.log(
      `| ${match.newSlug} | ${match.existingSlug} | ${match.similarity.toFixed(2)} | ${match.type} |`,
    );
  }
}

// Telegram 보고
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_REPORT_CHAT_ID;

if (botToken && chatId) {
  const text = buildDedupReportText(report);
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      },
    );
    if (!res.ok) {
      console.warn(`[telegram] send failed: ${res.status}`);
    }
  } catch (err) {
    console.warn(`[telegram] send error: ${err}`);
  }
} else {
  console.log("\n(Telegram 키 없음 — 보고 생략)");
}

process.exit(0);
