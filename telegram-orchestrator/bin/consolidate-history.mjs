#!/usr/bin/env node
/**
 * consolidate-history.mjs
 * 매일 새벽 실행 — 전날 Telegram 대화 에피소드를 Ollama로 요약해
 * Obsidian Telegram/Memory/YYYY-MM-DD.md 에 의미기억으로 저장한다.
 * (해마 sleep consolidation 패턴)
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OBSIDIAN_VAULT_ROOT =
  process.env.OBSIDIAN_VAULT_ROOT || "/Users/family/jason/jasonob";
const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const SUMMARY_MODEL =
  process.env.CONSOLIDATION_MODEL || process.env.OLLAMA_MODEL || "vibehub-chat-g4";

const TELEGRAM_DIR = path.join(OBSIDIAN_VAULT_ROOT, "Telegram");
const MEMORY_DIR = path.join(TELEGRAM_DIR, "Memory");

// 어제 날짜
function getYesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function ollamaGenerate(prompt) {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: SUMMARY_MODEL, prompt, stream: false }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.response?.trim() || "";
}

async function main() {
  const targetDate = process.argv[2] || getYesterdayStr(); // 인수로 날짜 지정 가능
  const episodeFile = path.join(TELEGRAM_DIR, `${targetDate}.md`);

  let rawContent;
  try {
    rawContent = await readFile(episodeFile, "utf8");
  } catch {
    console.log(`[consolidate] ${targetDate} 히스토리 없음 — 건너뜀`);
    process.exit(0);
  }

  const lines = rawContent.split("\n").filter(Boolean);
  if (lines.length === 0) {
    console.log("[consolidate] 빈 파일 — 건너뜀");
    process.exit(0);
  }

  // 라인 수가 너무 많으면 잘라서 요약 (모델 컨텍스트 한계 고려)
  const MAX_LINES = 200;
  const trimmed = lines.slice(-MAX_LINES).join("\n");

  console.log(`[consolidate] ${targetDate} 에피소드 ${lines.length}줄 → 요약 중...`);

  const prompt = `다음은 ${targetDate}에 나눈 Telegram 대화 기록이다.
이 대화에서 기억할 만한 핵심 사실, 결정, 반복된 주제, 배운 것을 간결하게 정리해라.
중요하지 않은 잡담은 생략하고, 다음에 대화할 때 맥락으로 유용한 정보만 남겨라.
한국어로 답해라.

--- 대화 기록 ---
${trimmed}
--- 끝 ---

요약:`;

  let summary;
  try {
    summary = await ollamaGenerate(prompt);
  } catch (e) {
    console.error(`[consolidate] Ollama 오류: ${e.message}`);
    process.exit(1);
  }

  await mkdir(MEMORY_DIR, { recursive: true });
  const memFile = path.join(MEMORY_DIR, `${targetDate}.md`);
  const memContent = `# ${targetDate} 대화 요약\n\n_생성: ${getTodayStr()} 새벽 자동 공고화_\n\n${summary}\n`;

  await writeFile(memFile, memContent, "utf8");
  console.log(`[consolidate] 완료 → Telegram/Memory/${targetDate}.md`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
