import { runSourceHealth, buildSourceHealthReportText } from "../shared/supabase-source-health";

const report = await runSourceHealth();

console.log(`\n## Source Health — ${report.ranAt}`);
console.log(`- 활성 소스: ${report.activeSourceCount}개`);
console.log(`- 비활성화: ${report.disabledThisRun.length}개`);
console.log(`- 무실적 경고: ${report.inactiveWarnings.length}개`);
console.log(`- maxItems 제안: ${report.maxItemsSuggestions.length}개`);
console.log(`- 신규 후보: ${report.newSourceCandidates.length}개`);

if (report.disabledThisRun.length > 0) {
  console.log("\n### 비활성화된 소스");
  for (const s of report.disabledThisRun) {
    console.log(`  ❌ ${s.name}: ${s.reason}`);
  }
}

if (report.inactiveWarnings.length > 0) {
  console.log("\n### 30일 무실적 경고");
  for (const w of report.inactiveWarnings) {
    console.log(`  ⚠️ ${w.name} (마지막: ${w.lastSuccessAt ?? "없음"})`);
  }
}

if (report.maxItemsSuggestions.length > 0) {
  console.log("\n### maxItems 조정 제안");
  console.log("| 소스 | brief 수 | maxItems | 제안 |");
  console.log("|------|---------|---------|------|");
  for (const s of report.maxItemsSuggestions) {
    console.log(`| ${s.name} | ${s.briefCount} | ${s.currentMaxItems} | ${s.suggestion} |`);
  }
}

if (report.newSourceCandidates.length > 0) {
  console.log("\n### 신규 후보 도메인");
  for (const c of report.newSourceCandidates.slice(0, 10)) {
    console.log(`  🔎 ${c.domain}`);
  }
}

// Telegram 보고
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_REPORT_CHAT_ID;

if (botToken && chatId) {
  const text = buildSourceHealthReportText(report);
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
