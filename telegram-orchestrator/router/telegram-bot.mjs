import { execFile } from "node:child_process";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { createModelState } from "./model-state.mjs";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const binDir = path.join(rootDir, "bin");

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_ALLOWED_CHAT_IDS = new Set(
  (process.env.TELEGRAM_ALLOWED_CHAT_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const BOOTSTRAP_OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen3:4b";
const ROUTER_WORKDIR = process.env.ROUTER_WORKDIR || "/Users/family/jason";
const CLAUDE_ENABLED = process.env.CLAUDE_ENABLED !== "0";
const CODEX_ENABLED = process.env.CODEX_ENABLED !== "0";
const LOCAL_ENABLED = process.env.LOCAL_ENABLED !== "0";
const SEARCH_ENABLED = process.env.SEARCH_ENABLED !== "0";
const SEARCH_MAX_RESULTS = Number(process.env.SEARCH_MAX_RESULTS || "5");
const OBSIDIAN_VAULT_ROOT =
  process.env.OBSIDIAN_VAULT_ROOT || "/Users/family/jason/jasonob";
const OBSIDIAN_TELEGRAM_DIR = path.join(OBSIDIAN_VAULT_ROOT, "Telegram");

const state = createModelState({
  rootDir,
  defaultModelName: BOOTSTRAP_OLLAMA_MODEL,
});

// Per-chatId conversation history (last 6 turns, in-memory)
const HISTORY_MAX = 6;
const conversationHistory = new Map();

function pushHistory(chatId, role, text) {
  const key = String(chatId);
  const arr = conversationHistory.get(key) || [];
  arr.push({ role, text: text.slice(0, 300) });
  if (arr.length > HISTORY_MAX) arr.shift();
  conversationHistory.set(key, arr);
}

function getRecentContext(chatId) {
  const arr = conversationHistory.get(String(chatId)) || [];
  if (arr.length === 0) return "";
  return arr.map((m) => `[${m.role}] ${m.text}`).join("\n");
}

// ── Obsidian 히스토리 영속화 ────────────────────────────────
function getTodayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function getTimeStr() {
  return new Date().toLocaleTimeString("ko-KR", { hour12: false }); // HH:MM:SS
}

async function appendToObsidian(chatId, role, text) {
  try {
    await mkdir(OBSIDIAN_TELEGRAM_DIR, { recursive: true });
    const filePath = path.join(OBSIDIAN_TELEGRAM_DIR, `${getTodayStr()}.md`);
    const line = `[${getTimeStr()}] [${chatId}] [${role}] ${text.slice(0, 500)}\n`;
    await appendFile(filePath, line, "utf8");
  } catch (e) {
    console.error(`[obsidian] append failed: ${e.message}`);
  }
}

async function loadHistoryFromObsidian() {
  try {
    const filePath = path.join(OBSIDIAN_TELEGRAM_DIR, `${getTodayStr()}.md`);
    const content = await readFile(filePath, "utf8");
    const lines = content.split("\n").filter(Boolean);
    // 라인 형식: [HH:MM:SS] [chatId] [role] text
    const re = /^\[[\d:]+\] \[(\d+)\] \[(user|assistant)\] (.+)$/;
    const byChat = new Map();
    for (const line of lines) {
      const m = line.match(re);
      if (!m) continue;
      const [, chatId, role, text] = m;
      if (!byChat.has(chatId)) byChat.set(chatId, []);
      byChat.get(chatId).push({ role, text });
    }
    // 각 chatId별로 마지막 HISTORY_MAX 턴만 복원
    for (const [chatId, arr] of byChat) {
      conversationHistory.set(chatId, arr.slice(-HISTORY_MAX));
    }
    console.log(`[obsidian] history restored for ${byChat.size} chat(s)`);
  } catch {
    console.log("[obsidian] no history file for today, starting fresh");
  }
}

if (!TELEGRAM_BOT_TOKEN) {
  console.error("Missing TELEGRAM_BOT_TOKEN. Copy .env.example to .env and set it first.");
  process.exit(1);
}

function isAllowedChat(chatId) {
  if (TELEGRAM_ALLOWED_CHAT_IDS.size === 0) return true;
  return TELEGRAM_ALLOWED_CHAT_IDS.has(String(chatId));
}

function getActiveModelName(role = "chat") {
  const active = state.getActiveRoleModels();
  return active[role]?.model_name || BOOTSTRAP_OLLAMA_MODEL;
}

function parseModelTargets(raw) {
  return raw
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseModelActivateArgs(raw) {
  const parts = parseModelTargets(raw);
  const [modelName, ...targets] = parts;
  return {
    modelName: modelName || "",
    targets,
  };
}

function detectPrimaryLanguage(text) {
  const koreanCount = (text.match(/[가-힣]/g) || []).length;
  const latinCount = (text.match(/[A-Za-z]/g) || []).length;
  return latinCount > koreanCount ? "en" : "ko";
}

function buildResult(text, telemetry = {}, admin = false) {
  return {
    text: text?.trim() || "(empty response)",
    telemetry: {
      route: telemetry.route || "local",
      needSearch: telemetry.needSearch === true,
      memoryShouldStore: telemetry.memoryShouldStore === true,
      responseLength: Number(telemetry.responseLength || text?.length || 0),
      mode: telemetry.mode || "default",
      sourceConsistent: telemetry.sourceConsistent !== false,
    },
    admin,
  };
}

async function telegram(method, body = {}) {
  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Telegram ${method} failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Telegram ${method} returned ok=false: ${JSON.stringify(data)}`);
  }
  return data.result;
}

async function sendMessage(chatId, text) {
  const safeText = text?.trim() || "(empty response)";
  const maxChunk = 3500;
  for (let start = 0; start < safeText.length; start += maxChunk) {
    await telegram("sendMessage", {
      chat_id: chatId,
      text: safeText.slice(start, start + maxChunk),
    });
  }
}

async function ollamaGenerate(prompt, { modelName = getActiveModelName("chat"), temperature = 0.2 } = {}) {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: modelName,
      prompt,
      stream: false,
      think: false,
      options: {
        temperature,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama generate failed for ${modelName}: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.response?.trim() || "";
}

async function runCommand(file, args) {
  const { stdout, stderr } = await execFileAsync(file, args, {
    cwd: ROUTER_WORKDIR,
    env: {
      ...process.env,
      ROUTER_WORKDIR,
    },
    maxBuffer: 8 * 1024 * 1024,
  });

  const combined = [stdout, stderr].filter(Boolean).join("\n").trim();
  return combined || "(no output)";
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(text) {
  return decodeHtmlEntities(text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function unwrapDuckDuckGoUrl(rawUrl) {
  const normalized = rawUrl.startsWith("//") ? `https:${rawUrl}` : rawUrl;

  try {
    const url = new URL(normalized);
    const wrapped = url.searchParams.get("uddg");
    return wrapped ? decodeURIComponent(wrapped) : normalized;
  } catch {
    return normalized;
  }
}

function parseSearchResults(htmlText) {
  const results = [];
  const anchorRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let match;

  while ((match = anchorRegex.exec(htmlText)) && results.length < SEARCH_MAX_RESULTS) {
    const href = unwrapDuckDuckGoUrl(match[1]);
    const title = stripHtml(match[2]);
    const nearby = htmlText.slice(match.index, match.index + 1800);
    const snippetMatch = nearby.match(
      /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>|<div[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/div>/,
    );
    const snippet = stripHtml(snippetMatch?.[1] || snippetMatch?.[2] || "");

    if (!title || !href) continue;
    if (results.some((item) => item.url === href)) continue;

    results.push({ title, url: href, snippet });
  }

  return results;
}

async function searchWeb(query) {
  const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
    headers: {
      "user-agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Web search failed: ${response.status} ${text.slice(0, 200)}`);
  }

  const htmlText = await response.text();
  return parseSearchResults(htmlText);
}

function extractJsonObject(raw, fallback) {
  const jsonStart = raw.indexOf("{");
  const jsonEnd = raw.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1) return fallback;

  try {
    return JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
  } catch {
    return fallback;
  }
}

async function classifySearchNeed(messageText, modelName = getActiveModelName("search")) {
  if (!SEARCH_ENABLED) {
    return {
      need_search: false,
      reason: "search disabled",
      search_queries: [],
    };
  }

  // 내부 시스템 키워드 fast-path: LLM 호출 없이 즉시 no-search 반환
  const INTERNAL_KEYWORDS = [
    "파이프라인", "pipeline", "오케스트레이터", "orchestrator",
    "자동화", "봇", "telegram", "텔레그램", "ollama", "모델",
    "오류확인", "오류 확인", "상태확인", "상태 확인", "잘 돌았", "잘돌았",
    "vibehub", "바이브허브", "/status", "/models",
  ];
  const lower = messageText.toLowerCase();
  if (INTERNAL_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()))) {
    return { need_search: false, reason: "internal system query", search_queries: [] };
  }

  const prompt = [
    "You decide whether web search is needed before answering.",
    "Search is needed for: current events, prices, stock/crypto, sports scores, weather, new product releases, recent laws or regulations, medical drug info, or any fact that changes over time.",
    "Search is NOT needed for: casual chat, brainstorming, writing help, reasoning, code review, explanations of timeless concepts, internal system questions, pipeline or bot status, orchestrator queries.",
    "Return strict JSON only with keys: need_search, reason, search_queries.",
    "need_search must be true or false.",
    "search_queries must contain 0 to 2 short search queries.",
    `User message: ${messageText}`,
  ].join("\n");

  const fallback = {
    need_search: false,
    reason: "classifier fallback",
    search_queries: [],
  };

  const parsed = extractJsonObject(await ollamaGenerate(prompt, { modelName }), fallback);
  parsed.need_search = parsed.need_search === true;
  parsed.search_queries = Array.isArray(parsed.search_queries)
    ? parsed.search_queries.map((value) => String(value).trim()).filter(Boolean).slice(0, 2)
    : [];

  if (parsed.need_search && parsed.search_queries.length === 0) {
    parsed.search_queries = [messageText];
  }

  return parsed;
}

async function routeMessage(messageText, modelName = getActiveModelName("router")) {
  const availability = [
    LOCAL_ENABLED ? "local is available" : "local is disabled",
    CLAUDE_ENABLED ? "claude is enabled" : "claude is disabled",
    CODEX_ENABLED ? "codex is enabled" : "codex is disabled",
  ].join("; ");

  const prompt = [
    "You are a strict router.",
    "Choose exactly one route: local, claude, or codex.",
    "Prefer local for most tasks: chat, summarization, classification, planning, reasoning, analysis, code review, and explanation. The local model (Gemma4 26B) is capable of complex reasoning.",
    "Prefer claude for: very long context (>10K tokens), multi-file code generation, explicit Claude requests, OR operator action requests targeting the VibeHub system.",
    "OPERATOR ACTION → claude: message contains ANY of these action verbs: 등록/적용/활성화/비활성화/추가/삭제/수정/변경/업데이트/복구/롤백/재시도/재실행/재생성/발행/공개/승인/교체/반영/생성/도입/배포/실험 (with 해줘/하다/해) AND context is VibeHub system (소스/source/maxItems/모델/자동화/브리프/brief/디스커버/discover/DB/파이프라인/pipeline/이미지/SEO/하네스/editorial/drift/ingest/PENDING/보고서/report) → route: claude.",
    "REPORT ACTION → claude: message contains a report block marker (━━━ or 📊 or PENDING or 건강성 or 드리프트 or drift or editorial or self-critique or seo or image-health or ingest) AND an action word → route: claude.",
    "RECOVERY/ERROR → claude: message mentions 복구/롤백/재시도/오류/에러/실패/예외 in context of a pipeline, automation, or system state → route: claude.",
    "Prefer codex for repository-aware terminal work or when shell-native agent behavior is useful.",
    `Availability: ${availability}.`,
    "Return strict JSON only with keys: route, prompt, reason.",
    `User message: ${messageText}`,
  ].join("\n");

  const raw = await ollamaGenerate(prompt, { modelName });
  const parsed = extractJsonObject(raw, {
    route: "local",
    prompt: messageText,
    reason: "router returned non-JSON, falling back to local",
  });

  if (!["local", "claude", "codex"].includes(parsed.route)) {
    return {
      route: "local",
      prompt: messageText,
      reason: "router returned invalid route, falling back to local",
    };
  }

  return parsed;
}

async function extractMemoryDecision(messageText, modelName = getActiveModelName("memory")) {
  const prompt = [
    "You decide if the user's message should become long-term preference memory.",
    "Store only durable user preferences, repeated working style, answer style, or standing constraints.",
    "Do not store temporary facts, one-off tasks, current mood, or ephemeral status.",
    "Return strict JSON only with keys: should_store, key_hint, reason.",
    `User message: ${messageText}`,
  ].join("\n");

  const fallback = {
    should_store: false,
    key_hint: "",
    reason: "memory fallback",
  };

  const parsed = extractJsonObject(await ollamaGenerate(prompt, { modelName }), fallback);
  return {
    should_store: parsed.should_store === true,
    key_hint: String(parsed.key_hint || "").trim().toLowerCase(),
    reason: String(parsed.reason || "").trim(),
  };
}

async function handleLocal(text, mode = "default", modelName = getActiveModelName("chat")) {
  const prompt =
    mode === "chat"
      ? [
          "You are a friendly everyday chat assistant.",
          "Reply in natural Korean unless the user wrote mostly English.",
          "Sound warm and conversational, not robotic.",
          "Keep the answer reasonably short, but still useful.",
          "If the user is just chatting, respond like a normal conversation partner.",
          `User message: ${text}`,
        ].join("\n")
      : [
          "You are a concise assistant replying in Korean unless the user wrote mostly English.",
          "Answer directly and keep useful detail.",
          `User request: ${text}`,
        ].join("\n");

  return ollamaGenerate(prompt, { modelName });
}

const VIBEHUB_CONTEXT = `
# VibeHub 프로젝트 컨텍스트
- 이 시스템은 VibeHub Media Hub 자동화 파이프라인의 Telegram 운영 인터페이스다.
- 프로젝트 루트: ${path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), "../.."))}
- 핵심 자동화: daily-pipeline, weekly-source-health, editorial-review, drift-guard, image-health, seo-audit 등
- Supabase DB에 sources, brief_posts, discover_items 테이블이 있다.
- 운영자 액션(등록/적용/승인/복구 등)은 Supabase MCP 또는 로컬 스크립트로 처리한다.
- 보고서 말미의 [PENDING-*] 블록이 처리 대상 항목이다.
- 상세 컨텍스트: CLAUDE.md 및 docs/status/PROJECT-STATUS.md 참조.
`.trim();

async function handleClaude(text, context = "") {
  if (!CLAUDE_ENABLED) {
    return "Claude route is disabled in .env";
  }
  const parts = [VIBEHUB_CONTEXT];
  if (context) parts.push(`대화 맥락 (최근 메시지):\n${context}`);
  parts.push(`현재 요청: ${text}`);
  const prompt = parts.join("\n\n");
  return runCommand(path.join(binDir, "run-claude.sh"), [prompt]);
}

async function handleCodex(text) {
  if (!CODEX_ENABLED) {
    return "Codex route is disabled in .env";
  }
  return runCommand(path.join(binDir, "run-codex.sh"), [text]);
}

async function answerWithSearch(
  messageText,
  {
    mode = "default",
    forceSearch = false,
    chatModelName = getActiveModelName("chat"),
    searchModelName = getActiveModelName("search"),
    searchPlanOverride = null,
  } = {},
) {
  const searchPlan = searchPlanOverride ||
    (forceSearch
      ? {
          need_search: true,
          reason: "forced search",
          search_queries: [messageText],
        }
      : await classifySearchNeed(messageText, searchModelName));

  if (!searchPlan.need_search) return null;

  const queries = searchPlan.search_queries.slice(0, 2);
  const results = [];

  for (const query of queries) {
    const queryResults = await searchWeb(query);
    for (const item of queryResults) {
      if (results.some((existing) => existing.url === item.url)) continue;
      results.push(item);
      if (results.length >= SEARCH_MAX_RESULTS) break;
    }
    if (results.length >= SEARCH_MAX_RESULTS) break;
  }

  if (results.length === 0) {
    return {
      usedSearch: true,
      reason: searchPlan.reason || "search requested",
      body: "검색을 시도했지만 쓸 만한 결과를 찾지 못했습니다.",
      results: [],
      sourceConsistent: false,
    };
  }

  const renderedResults = results
    .map((item, index) =>
      [
        `[${index + 1}] ${item.title}`,
        `URL: ${item.url}`,
        item.snippet ? `Snippet: ${item.snippet}` : "Snippet: (none)",
      ].join("\n"),
    )
    .join("\n\n");

  const prompt =
    mode === "chat"
      ? [
          "You are a helpful Korean chat assistant using fresh web results.",
          "Answer naturally in Korean unless the user wrote mostly English.",
          "Use the provided search results for factual claims.",
          "Cite source numbers like [1] or [2] inline when making factual claims.",
          "If the results are insufficient, say so clearly.",
          `User message: ${messageText}`,
          "Search results:",
          renderedResults,
        ].join("\n")
      : [
          "You are a concise Korean assistant using fresh web results.",
          "Use the provided search results for factual claims.",
          "Cite source numbers like [1] or [2] inline when making factual claims.",
          "If the results are insufficient, say so clearly.",
          `User request: ${messageText}`,
          "Search results:",
          renderedResults,
        ].join("\n");

  const answer = await ollamaGenerate(prompt, { modelName: chatModelName });
  const sources = results.map((item, index) => `${index + 1}. ${item.title}\n${item.url}`).join("\n");

  return {
    usedSearch: true,
    reason: searchPlan.reason || "search requested",
    body: `${answer}\n\nSources:\n${sources}`,
    results,
    sourceConsistent: /\[\d+\]/.test(answer),
  };
}

function parseEvalCaseRecord(row) {
  return {
    ...row,
    expected_json: JSON.parse(row.expected_json),
    style_constraints: JSON.parse(row.style_constraints),
  };
}

function evaluateTextConstraints(responseText, expected) {
  const issues = [];
  const normalized = responseText.trim();
  const language = detectPrimaryLanguage(normalized);

  if (expected.language && expected.language !== language) {
    issues.push(`language:${language}`);
  }
  if (expected.min_length && normalized.length < expected.min_length) {
    issues.push(`too_short:${normalized.length}`);
  }
  if (expected.max_length && normalized.length > expected.max_length) {
    issues.push(`too_long:${normalized.length}`);
  }
  if (expected.must_include_any) {
    const passed = expected.must_include_any.some((needle) => normalized.includes(needle));
    if (!passed) issues.push("missing_required_phrase");
  }
  if (expected.must_not_include) {
    const found = expected.must_not_include.find((needle) => normalized.includes(needle));
    if (found) issues.push(`contains_forbidden:${found}`);
  }

  return {
    pass: issues.length === 0,
    issues,
  };
}

async function runEvalSuite(modelName) {
  const cases = state.getEvalCases().map(parseEvalCaseRecord);
  const latencies = [];
  const failureNames = [];
  const caseCounts = {
    chat_eval: 0,
    search_eval: 0,
    routing_eval: 0,
    memory_eval: 0,
  };
  const passCounts = {
    chat_eval: 0,
    search_eval: 0,
    routing_eval: 0,
    memory_eval: 0,
  };
  let routingRemoteCount = 0;
  let searchPositiveCount = 0;
  let memoryFalsePositiveCount = 0;
  let memoryNegativeCaseCount = 0;

  for (const evalCase of cases) {
    const startedAt = Date.now();
    let pass = false;

    if (evalCase.kind === "chat_eval") {
      const response = await handleLocal(
        evalCase.input_text,
        evalCase.style_constraints.mode || "default",
        modelName,
      );
      const result = evaluateTextConstraints(response, evalCase.expected_json);
      pass = result.pass;
    } else if (evalCase.kind === "search_eval") {
      const decision = await classifySearchNeed(evalCase.input_text, modelName);
      pass = decision.need_search === evalCase.expected_json.need_search;
      if (decision.need_search) searchPositiveCount += 1;
    } else if (evalCase.kind === "routing_eval") {
      const decision = await routeMessage(evalCase.input_text, modelName);
      pass = decision.route === evalCase.expected_json.route;
      if (decision.route !== "local") routingRemoteCount += 1;
    } else if (evalCase.kind === "memory_eval") {
      const decision = await extractMemoryDecision(evalCase.input_text, modelName);
      pass = decision.should_store === evalCase.expected_json.should_store;
      if (evalCase.expected_json.should_store === false) {
        memoryNegativeCaseCount += 1;
        if (decision.should_store) memoryFalsePositiveCount += 1;
      }
      if (
        pass &&
        evalCase.expected_json.should_store === true &&
        evalCase.expected_json.key_hint
      ) {
        pass = decision.key_hint.includes(evalCase.expected_json.key_hint);
      }
    }

    const latencyMs = Date.now() - startedAt;
    latencies.push(latencyMs);
    caseCounts[evalCase.kind] += 1;
    if (pass) {
      passCounts[evalCase.kind] += 1;
    } else {
      failureNames.push(evalCase.name);
    }
  }

  const totalRouting = caseCounts.routing_eval || 1;
  const totalSearch = caseCounts.search_eval || 1;
  const totalMemoryNegative = memoryNegativeCaseCount || 1;

  return {
    chat_quality: passCounts.chat_eval / (caseCounts.chat_eval || 1),
    routing_accuracy: passCounts.routing_eval / totalRouting,
    search_decision_accuracy: passCounts.search_eval / totalSearch,
    memory_extraction_precision: passCounts.memory_eval / (caseCounts.memory_eval || 1),
    latency_p50: percentile(latencies, 50),
    latency_p95: percentile(latencies, 95),
    token_cost_proxy: 0,
    remote_delegate_rate: routingRemoteCount / totalRouting,
    search_positive_rate: searchPositiveCount / totalSearch,
    memory_false_positive_rate: memoryFalsePositiveCount / totalMemoryNegative,
    failure_names: failureNames.slice(0, 12),
    case_counts: caseCounts,
  };
}

function percentile(values, pct) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1));
  return sorted[index];
}

function compareMetrics(candidate, baseline) {
  const delta = {
    chat_quality: candidate.chat_quality - baseline.chat_quality,
    routing_accuracy: candidate.routing_accuracy - baseline.routing_accuracy,
    search_decision_accuracy: candidate.search_decision_accuracy - baseline.search_decision_accuracy,
    memory_extraction_precision:
      candidate.memory_extraction_precision - baseline.memory_extraction_precision,
    remote_delegate_rate: candidate.remote_delegate_rate - baseline.remote_delegate_rate,
    latency_p95: candidate.latency_p95 - baseline.latency_p95,
  };

  const minimums = {
    chat_quality: 0.75,
    routing_accuracy: 0.75,
    search_decision_accuracy: 0.75,
    memory_extraction_precision: 0.75,
  };

  const passed =
    candidate.chat_quality >= minimums.chat_quality &&
    candidate.routing_accuracy >= minimums.routing_accuracy &&
    candidate.search_decision_accuracy >= minimums.search_decision_accuracy &&
    candidate.memory_extraction_precision >= minimums.memory_extraction_precision &&
    delta.chat_quality >= -0.05 &&
    delta.routing_accuracy >= -0.05 &&
    delta.search_decision_accuracy >= -0.05 &&
    delta.memory_extraction_precision >= -0.05;

  return {
    passed,
    delta,
    minimums,
  };
}

async function runModelEvaluation(modelName) {
  state.ensureModel(modelName);
  state.updateModelStatus(modelName, "warmup");

  try {
    await ollamaGenerate("Reply with exactly OK.", { modelName });
  } catch (error) {
    state.updateModelStatus(modelName, "registered", {
      notes: `Warmup failed: ${error.message}`,
    });
    return `warmup failed for ${modelName}\n${error.message}`;
  }

  state.updateModelStatus(modelName, "eval_pending");
  const startedAt = new Date().toISOString();
  const baselineModelName = getActiveModelName("chat");
  const candidateMetrics = await runEvalSuite(modelName);
  const baselineMetrics =
    baselineModelName === modelName ? candidateMetrics : await runEvalSuite(baselineModelName);
  const comparison = compareMetrics(candidateMetrics, baselineMetrics);
  const finishedAt = new Date().toISOString();

  const metrics = {
    candidate: candidateMetrics,
    baseline: baselineMetrics,
    delta: comparison.delta,
    minimums: comparison.minimums,
  };

  const summary = [
    `${comparison.passed ? "PASS" : "FAIL"} ${modelName}`,
    `chat=${candidateMetrics.chat_quality.toFixed(2)} baseline=${baselineMetrics.chat_quality.toFixed(2)}`,
    `route=${candidateMetrics.routing_accuracy.toFixed(2)} baseline=${baselineMetrics.routing_accuracy.toFixed(2)}`,
    `search=${candidateMetrics.search_decision_accuracy.toFixed(2)} baseline=${baselineMetrics.search_decision_accuracy.toFixed(2)}`,
    `memory=${candidateMetrics.memory_extraction_precision.toFixed(2)} baseline=${baselineMetrics.memory_extraction_precision.toFixed(2)}`,
  ].join(" | ");

  state.saveEvalRun({
    modelName,
    baselineModelName,
    metrics,
    passed: comparison.passed,
    summary,
    startedAt,
    finishedAt,
  });

  if (!comparison.passed) {
    state.updateModelStatus(modelName, "registered", {
      notes: summary,
    });
  }

  return [
    summary,
    "",
    `candidate latency p50=${candidateMetrics.latency_p50}ms p95=${candidateMetrics.latency_p95}ms`,
    `candidate remote_delegate_rate=${(candidateMetrics.remote_delegate_rate * 100).toFixed(1)}%`,
    `candidate failures=${candidateMetrics.failure_names.length ? candidateMetrics.failure_names.join(", ") : "none"}`,
  ].join("\n");
}

function renderModels() {
  const rows = state.listModels();
  const activeStages = state.getActiveStageModels();
  if (rows.length === 0) return "등록된 모델이 없습니다.";

  return rows
    .map((row) => {
      const roles = [
        row.active_for_chat ? "chat" : null,
        row.active_for_router ? "router" : null,
        row.active_for_search ? "search" : null,
        row.active_for_memory ? "memory" : null,
      ]
        .filter(Boolean)
        .join(",");
      const evalMark = row.last_eval_at
        ? `${row.last_eval_passed ? "pass" : "fail"} @ ${row.last_eval_at}`
        : "never";
      const stages = Object.entries(activeStages)
        .filter(([, model]) => model?.id === row.id)
        .map(([stage]) => stage.replace(/_/g, "-"))
        .join(",");
      return `- ${row.model_name} | status=${row.status} | roles=${roles || "-"} | stages=${stages || "-"} | eval=${evalMark}`;
    })
    .join("\n");
}

async function getStatusText() {
  const checks = [];
  const summary = state.getStatusSummary();
  const active = summary.active;
  const stages = summary.stages;
  const candidateModels = state
    .listModels()
    .filter((row) => row.status === "candidate")
    .map((row) => row.model_name);

  checks.push(`workdir: ${ROUTER_WORKDIR}`);
  checks.push(
    `active models: chat=${active.chat?.model_name || "-"}, router=${active.router?.model_name || "-"}, search=${active.search?.model_name || "-"}, memory=${active.memory?.model_name || "-"}`,
  );
  checks.push(
    `active stages: classifier=${stages.classifier?.model_name || "-"}, brief-draft=${stages.brief_draft?.model_name || "-"}, discover-draft=${stages.discover_draft?.model_name || "-"}, critic=${stages.critic?.model_name || "-"}`,
  );
  checks.push(`bootstrap env model: ${BOOTSTRAP_OLLAMA_MODEL}`);
  checks.push(`web search: ${SEARCH_ENABLED ? "enabled" : "disabled"}`);
  checks.push(`shadow model: ${summary.shadow?.model_name || "-"}`);
  checks.push(`candidate models: ${candidateModels.length ? candidateModels.join(", ") : "-"}`);
  checks.push(
    `last model eval: ${
      summary.latestEval
        ? `${summary.latestEval.model_name} (${Number(summary.latestEval.passed) === 1 ? "pass" : "fail"}) ${summary.latestEval.finished_at}`
        : "-"
    }`,
  );
  checks.push(
    `recent rollback: ${
      summary.recentRollback
        ? `${summary.recentRollback.from_model_name || "-"} -> ${summary.recentRollback.to_model_name || "-"} @ ${summary.recentRollback.created_at}`
        : "-"
    }`,
  );

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    checks.push(`ollama: ${response.ok ? "reachable" : `http ${response.status}`}`);
  } catch (error) {
    checks.push(`ollama: unavailable (${error.message})`);
  }

  try {
    await runCommand("which", ["claude"]);
    checks.push("claude cli: installed");
  } catch {
    checks.push("claude cli: missing");
  }

  try {
    const output = await runCommand("claude", ["-p", "Reply with OK", "--output-format", "text"]);
    checks.push(`claude auth: ready (${output.slice(0, 40)})`);
  } catch {
    checks.push("claude auth: not ready");
  }

  try {
    const output = await runCommand("codex", ["login", "status"]);
    checks.push(`codex auth: ${output.replace(/\s+/g, " ")}`);
  } catch {
    checks.push("codex auth: unavailable");
  }

  return checks.join("\n");
}

async function executeAuto(text, { mode = "default", includeHeader = false, forceSearch = false, context = "" } = {}) {
  const chatModelName = getActiveModelName("chat");
  const searchModelName = getActiveModelName("search");
  const routerModelName = getActiveModelName("router");
  const memoryModelName = getActiveModelName("memory");

  const searched = await answerWithSearch(text, {
    mode,
    forceSearch,
    chatModelName,
    searchModelName,
  });
  const memoryDecision = await extractMemoryDecision(text, memoryModelName);

  if (searched) {
    const body = includeHeader
      ? `route: search+local\nreason: ${searched.reason}\n\n${searched.body}`
      : searched.body;
    return buildResult(
      body,
      {
        route: "local",
        needSearch: true,
        memoryShouldStore: memoryDecision.should_store,
        responseLength: body.length,
        mode,
        sourceConsistent: searched.sourceConsistent,
      },
      false,
    );
  }

  const route = await routeMessage(text, routerModelName);
  const selectedText = route.prompt || text;
  let body = "";

  if (route.route === "claude") {
    body = await handleClaude(selectedText, context);
  } else if (route.route === "codex") {
    body = await handleCodex(selectedText);
  } else {
    body = await handleLocal(selectedText, mode, chatModelName);
  }

  const rendered = includeHeader ? `route: ${route.route}\nreason: ${route.reason || "-"}\n\n${body}` : body;
  return buildResult(
    rendered,
    {
      route: route.route,
      needSearch: false,
      memoryShouldStore: memoryDecision.should_store,
      responseLength: rendered.length,
      mode,
      sourceConsistent: true,
    },
    false,
  );
}

async function dispatchCommand(text, context = "") {
  const trimmed = text.trim();

  if (trimmed === "/help") {
    return buildResult(
      [
        "Commands:",
        "/help",
        "/status",
        "/models",
        "/model-eval <model>",
        "/model-shadow <model>",
        "/model-activate <model> [targets]",
        "/model-rollback [targets]",
        "/fact <message>",
        "/chat <message>",
        "/local <message>",
        "/claude <message>",
        "/codex <message>",
        "/auto <message>",
        "",
        "Plain messages without / are auto-routed and searched when needed.",
      ].join("\n"),
      { route: "local", mode: "default" },
      true,
    );
  }

  if (trimmed === "/status") {
    return buildResult(await getStatusText(), { route: "local" }, true);
  }

  if (trimmed === "/models") {
    return buildResult(renderModels(), { route: "local" }, true);
  }

  if (!trimmed.startsWith("/")) {
    return executeAuto(trimmed, {
      mode: "chat",
      includeHeader: false,
      context,
    });
  }

  const [command, ...restParts] = trimmed.split(/\s+/);
  const rest = restParts.join(" ").trim();

  if (!rest && !["/help", "/status", "/models", "/model-rollback"].includes(command)) {
    return buildResult("메시지를 같이 보내주세요. 예: /auto 오늘 할 일 정리", {}, true);
  }

  if (command === "/model-eval") {
    return buildResult(await runModelEvaluation(rest), { route: "local" }, true);
  }

  if (command === "/model-shadow") {
    const shadowed = state.startShadow(rest);
    return buildResult(
      `shadow started for ${shadowed.model_name}\nrequest target=${shadowed.shadow_request_target}`,
      { route: "local" },
      true,
    );
  }

  if (command === "/model-activate") {
    const { modelName, targets } = parseModelActivateArgs(rest);
    const activation = state.activateModel(modelName, targets);
    return buildResult(
      [
        `activated ${activation.model.model_name}`,
        `targets: ${activation.targets.join(", ")}`,
        `previous stable snapshot chat model: ${
          activation.previousSnapshot.role_model_ids.chat_model_id ? "saved" : "none"
        }`,
        `baseline metrics captured: ${
          activation.baselineMetrics?.request_count ? activation.baselineMetrics.request_count : 0
        } requests`,
      ].join("\n"),
      { route: "local" },
      true,
    );
  }

  if (command === "/model-rollback") {
    const rollbackTargets = rest ? parseModelTargets(rest) : null;
    const rollback = state.rollbackModel("manual /model-rollback", rollbackTargets);
    return buildResult(
      `rolled back (${rollback.targets.join(", ")}): ${rollback.from?.model_name || "-"} -> ${rollback.to?.model_name || "-"}`,
      { route: "local" },
      true,
    );
  }

  if (command === "/fact") {
    const result = await executeAuto(rest, {
      mode: "default",
      includeHeader: false,
      forceSearch: true,
      context,
    });
    return buildResult(result.text, result.telemetry, false);
  }

  if (command === "/chat") {
    const modelName = getActiveModelName("chat");
    const memoryDecision = await extractMemoryDecision(rest, getActiveModelName("memory"));
    const body = await handleLocal(rest, "chat", modelName);
    return buildResult(body, {
      route: "local",
      needSearch: false,
      memoryShouldStore: memoryDecision.should_store,
      responseLength: body.length,
      mode: "chat",
    });
  }

  if (command === "/local") {
    const modelName = getActiveModelName("chat");
    const memoryDecision = await extractMemoryDecision(rest, getActiveModelName("memory"));
    const body = await handleLocal(rest, "default", modelName);
    return buildResult(body, {
      route: "local",
      needSearch: false,
      memoryShouldStore: memoryDecision.should_store,
      responseLength: body.length,
      mode: "default",
    });
  }

  if (command === "/claude") {
    const memoryDecision = await extractMemoryDecision(rest, getActiveModelName("memory"));
    const body = await handleClaude(rest, context);
    return buildResult(body, {
      route: "claude",
      needSearch: false,
      memoryShouldStore: memoryDecision.should_store,
      responseLength: body.length,
      mode: "default",
    });
  }

  if (command === "/codex") {
    const memoryDecision = await extractMemoryDecision(rest, getActiveModelName("memory"));
    const body = await handleCodex(rest);
    return buildResult(body, {
      route: "codex",
      needSearch: false,
      memoryShouldStore: memoryDecision.should_store,
      responseLength: body.length,
      mode: "default",
    });
  }

  if (command === "/auto") {
    return executeAuto(rest, {
      mode: "default",
      includeHeader: true,
      context,
    });
  }

  return buildResult("알 수 없는 명령입니다. /help 를 보내세요.", {}, true);
}

async function runShadowForMessage(messageText, activeResult) {
  const shadowModel = state.getShadowModel();
  if (!shadowModel) return null;

  const startedAt = Date.now();

  try {
    const memoryDecision = await extractMemoryDecision(messageText, shadowModel.model_name);
    const searchPlan = await classifySearchNeed(messageText, shadowModel.model_name);
    let candidateRoute = "local";
    let candidateText = "";
    let sourceConsistent = activeResult.telemetry.sourceConsistent !== false;

    if (searchPlan.need_search) {
      const searched = await answerWithSearch(messageText, {
        mode: activeResult.telemetry.mode || "default",
        forceSearch: true,
        chatModelName: shadowModel.model_name,
        searchModelName: shadowModel.model_name,
        searchPlanOverride: searchPlan,
      });
      candidateText = searched?.body || "";
      candidateRoute = "local";
      sourceConsistent =
        activeResult.telemetry.needSearch === true ? searched?.sourceConsistent === true : false;
    } else {
      const routed = await routeMessage(messageText, shadowModel.model_name);
      candidateRoute = routed.route;
      if (routed.route === "local") {
        candidateText = await handleLocal(
          routed.prompt || messageText,
          activeResult.telemetry.mode || "default",
          shadowModel.model_name,
        );
      }
    }

    state.recordShadowObservation(shadowModel.model_name, {
      input_text: messageText,
      active_route: activeResult.telemetry.route,
      candidate_route: candidateRoute,
      active_need_search: activeResult.telemetry.needSearch,
      candidate_need_search: searchPlan.need_search,
      active_response_length: activeResult.telemetry.responseLength,
      candidate_response_length: candidateText.length,
      active_latency_ms: 0,
      candidate_latency_ms: Date.now() - startedAt,
      active_memory_store: activeResult.telemetry.memoryShouldStore,
      candidate_memory_store: memoryDecision.should_store,
      source_consistent: sourceConsistent,
    });

    return state.finalizeShadowIfReady(shadowModel.model_name);
  } catch (error) {
    return {
      ready: false,
      promoted: false,
      error: error.message,
    };
  }
}

async function handleUpdate(update) {
  const message = update.message;
  if (!message?.text) return;

  const chatId = message.chat.id;
  if (!isAllowedChat(chatId)) {
    await sendMessage(chatId, "이 채팅은 허용 목록에 없습니다.");
    return;
  }

  try {
    const startedAt = Date.now();
    pushHistory(chatId, "user", message.text);
    await appendToObsidian(chatId, "user", message.text);
    const context = getRecentContext(chatId);
    const result = await dispatchCommand(message.text, context);
    if (!result.admin) {
      pushHistory(chatId, "assistant", result.text);
      await appendToObsidian(chatId, "assistant", result.text);
    }
    await sendMessage(chatId, result.text);

    if (!result.admin) {
      state.recordRequestMetric({
        modelName: getActiveModelName("chat"),
        route: result.telemetry.route,
        needSearch: result.telemetry.needSearch,
        latencyMs: Date.now() - startedAt,
        memoryShouldStore: result.telemetry.memoryShouldStore,
      });

      const rollbackCheck = state.maybeRollbackActiveModel();
      if (rollbackCheck.rolledBack) {
        await sendMessage(
          chatId,
          `모델이 자동 롤백되었습니다.\n${rollbackCheck.rollback.reason}`,
        );
      }

      const shadowResult = await runShadowForMessage(message.text, result);
      if (shadowResult?.ready) {
        await sendMessage(
          chatId,
          shadowResult.promoted
            ? `shadow 검증 완료: candidate 승격`
            : `shadow 검증 실패: candidate 승격 보류`,
        );
      }
    }
  } catch (error) {
    await sendMessage(chatId, `오류: ${error.message}`);
  }
}

async function main() {
  let offset = 0;
  const active = state.getActiveRoleModels();
  console.log(
    `Telegram orchestrator started. chat=${active.chat?.model_name || "-"} router=${active.router?.model_name || "-"} search=${active.search?.model_name || "-"} memory=${active.memory?.model_name || "-"}`,
  );

  // 오늘치 Obsidian 히스토리 복원
  await loadHistoryFromObsidian();

  while (true) {
    try {
      const updates = await telegram("getUpdates", {
        timeout: 30,
        offset,
        allowed_updates: ["message"],
      });

      for (const update of updates) {
        offset = update.update_id + 1;
        await handleUpdate(update);
      }
    } catch (error) {
      console.error(`[polling] ${error.stack || error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
