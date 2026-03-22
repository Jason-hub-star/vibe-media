import { NextResponse } from "next/server";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export async function POST() {
  const start = performance.now();

  try {
    const { stdout } = await execAsync("npm run pipeline:supabase-sync", {
      cwd: process.cwd().replace(/apps\/web$/, ""),
      timeout: 60_000,
    });

    const itemMatch = stdout.match(/items synced:\s*(\d+)/);
    const itemCount = itemMatch ? parseInt(itemMatch[1], 10) : 0;
    const durationMs = Math.round(performance.now() - start);

    return NextResponse.json({ ok: true, itemCount, durationMs });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "sync failed" },
      { status: 500 },
    );
  }
}
