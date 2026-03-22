import { NextResponse } from "next/server";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

interface SourceResult {
  id: string;
  items: number;
  ok: boolean;
  error?: string;
}

function parseSourceResults(stdout: string): SourceResult[] {
  const sources: SourceResult[] = [];
  // Match lines like: [source-id] 5 items fetched
  // or: [source-id] error: timeout
  const sourcePattern = /\[([^\]]+)\]\s+(\d+)\s+items?\s+fetched/g;
  const errorPattern = /\[([^\]]+)\]\s+error:\s*(.+)/g;

  let match: RegExpExecArray | null;
  while ((match = sourcePattern.exec(stdout)) !== null) {
    sources.push({ id: match[1], items: parseInt(match[2], 10), ok: true });
  }
  while ((match = errorPattern.exec(stdout)) !== null) {
    const existing = sources.find((s) => s.id === match![1]);
    if (existing) {
      existing.ok = false;
      existing.error = match[2].trim();
    } else {
      sources.push({ id: match[1], items: 0, ok: false, error: match[2].trim() });
    }
  }
  return sources;
}

export async function POST() {
  const start = performance.now();

  try {
    const { stdout } = await execAsync("npm run pipeline:live-fetch", {
      cwd: process.cwd().replace(/apps\/web$/, ""),
      timeout: 60_000,
    });

    const itemMatch = stdout.match(/items fetched:\s*(\d+)/);
    const itemCount = itemMatch ? parseInt(itemMatch[1], 10) : 0;
    const durationMs = Math.round(performance.now() - start);
    const sources = parseSourceResults(stdout);

    return NextResponse.json({ ok: true, itemCount, durationMs, sources });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "fetch failed" },
      { status: 500 },
    );
  }
}
