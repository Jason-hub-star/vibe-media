/**
 * Daily pipeline runner.
 * Executes pipeline steps sequentially and sends a Telegram report.
 */
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sendPipelineReport, type PipelineStageResult } from "../shared/telegram-report.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "../../../..");

interface StepDef {
  id: string;
  label: string;
  command: string;
  itemPattern: RegExp;
}

const STEPS: StepDef[] = [
  { id: "fetch", label: "Source Fetch", command: "npm run pipeline:live-fetch", itemPattern: /items fetched:\s*(\d+)/ },
  { id: "ingest", label: "Ingest", command: "npm run pipeline:live-ingest", itemPattern: /items stored:\s*(\d+)/ },
  { id: "sync", label: "Supabase Sync", command: "npm run pipeline:supabase-sync", itemPattern: /items synced:\s*(\d+)/ },
  { id: "obsidian-export", label: "Obsidian Export", command: "npm run pipeline:obsidian-export", itemPattern: /items exported:\s*(\d+)/ },
];

async function main() {
  const results: PipelineStageResult[] = [];
  const highlights: string[] = [];
  let totalItems = 0;
  const overallStart = Date.now();

  for (const step of STEPS) {
    const start = Date.now();
    try {
      const stdout = execSync(step.command, {
        cwd: rootDir,
        timeout: 120_000,
        encoding: "utf-8",
      });
      const match = stdout.match(step.itemPattern);
      const itemCount = match ? parseInt(match[1], 10) : 0;
      totalItems += itemCount;
      if (itemCount === 0) {
        highlights.push(`${step.label} returned 0 items. Source freshness or stdout parsing을 확인하세요.`);
      }
      results.push({
        id: step.id,
        label: step.label,
        status: "done",
        itemCount,
        durationMs: Date.now() - start,
      });
    } catch (err) {
      highlights.push(`${step.label} 단계에서 중단됐고 이후 단계는 실행되지 않았습니다.`);
      results.push({
        id: step.id,
        label: step.label,
        status: "error",
        durationMs: Date.now() - start,
        errorMessage: err instanceof Error ? err.message.slice(0, 200) : "Unknown error",
      });
      break;
    }
  }

  // Mark remaining stages as idle
  for (const step of STEPS) {
    if (!results.find((r) => r.id === step.id)) {
      results.push({ id: step.id, label: step.label, status: "idle" });
    }
  }

  const totalDurationMs = Date.now() - overallStart;
  const errorCount = results.filter((r) => r.status === "error").length;
  if (errorCount === 0 && totalItems === 0) {
    highlights.push("전체 처리 건수가 0입니다. 실제 무변경일 수도 있지만 source 상태와 itemPattern을 다시 확인하세요.");
  }

  await sendPipelineReport({ stages: results, totalDurationMs, totalItems, errorCount, highlights });

  console.log(`Pipeline complete: ${totalItems} items, ${errorCount} errors, ${(totalDurationMs / 1000).toFixed(1)}s`);
  process.exit(errorCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Daily pipeline failed:", err);
  process.exit(1);
});
