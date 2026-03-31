/**
 * Shorts / Longform 영상 렌더 워커.
 *
 * Brief 텍스트에서 Shorts(9:16) + Longform(16:9) 영상을 자동 생성.
 * 흐름: Gemini 스크립트 → MimikaStudio TTS → Whisper word-level →
 *       Pexels 배경 → Remotion BriefShort V3 → ffmpeg+BGM
 *
 * Usage:
 *   npm run video:render <slug> [--shorts-only] [--longform-only] [--dry-run] [--locale=es]
 */

import path from "path";
import fs from "fs/promises";
import { renderBriefVideo } from "@vibehub/media-engine/src/video/render-brief-video";
import type { VideoFormat } from "@vibehub/media-engine/src/video/script-generator";
import { getSupabaseBriefDetail } from "../shared/supabase-editorial-read";

// ---------------------------------------------------------------------------
// CLI Args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const slugArg = args.find((a) => !a.startsWith("--"));
const shortsOnly = args.includes("--shorts-only");
const longformOnly = args.includes("--longform-only");
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const localeArg = args.find((a) => a.startsWith("--locale="));
const locale = localeArg?.split("=")[1] ?? "es";

if (!slugArg) {
  console.error("Usage: npm run video:render <slug> [--shorts-only] [--longform-only] [--dry-run] [--force] [--locale=es]");
  process.exit(1);
}
const slug: string = slugArg!;

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const PROJECT_ROOT = path.resolve(import.meta.dirname, "../../../../");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "output", slug);
const BGM_DIR = path.join(PROJECT_ROOT, "assets", "bgm");
const MEDIA_ENGINE_DIR = path.join(PROJECT_ROOT, "packages", "media-engine");
const REMOTION_ENTRY = path.join(MEDIA_ENGINE_DIR, "src", "remotion", "index.tsx");

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n🎬 Video Render: ${slug}`);
  console.log(`   Locale: ${locale} | Dry-run: ${dryRun}`);
  console.log(`   Shorts: ${!longformOnly} | Longform: ${!shortsOnly}\n`);

  // 1) Brief 조회
  const brief = await getSupabaseBriefDetail(slug);
  if (!brief) {
    console.error(`Brief not found: ${slug}`);
    process.exit(1);
  }

  const body = brief.body.join("\n\n");
  const formats: VideoFormat[] = [];

  if (!longformOnly) formats.push("shorts");
  if (!shortsOnly) formats.push("longform");

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const results: { format: string; success: boolean; path?: string; error?: string }[] = [];

  for (const format of formats) {
    const outputFile = path.join(OUTPUT_DIR, `${format}.mp4`);

    // 기존 파일 존재 시 skip (--force면 무시)
    if (!force) {
      try {
        await fs.access(outputFile);
        console.log(`⏭️  ${format}.mp4 already exists — skipping (use --force to re-render)`);
        results.push({ format, success: true, path: outputFile });
        continue;
      } catch {
        // 파일 없음 — 렌더 진행
      }
    }

    console.log(`\n▶ Rendering ${format}...`);
    const result = await renderBriefVideo({
      title: brief.title,
      summary: brief.summary,
      body,
      outputDir: OUTPUT_DIR,
      format,
      locale,
      bgmDir: BGM_DIR,
      remotionEntry: REMOTION_ENTRY,
      dryRun,
    });

    results.push({
      format,
      success: result.success,
      path: result.success ? result.outputPath : undefined,
      error: result.error,
    });
  }

  // 결과 요약
  console.log("\n" + "=".repeat(50));
  console.log("📊 Render Summary");
  console.log("=".repeat(50));

  let allSuccess = true;
  for (const r of results) {
    const status = r.success ? "✅" : "❌";
    console.log(`  ${status} ${r.format}: ${r.path ?? r.error}`);
    if (!r.success) allSuccess = false;
  }

  console.log("=".repeat(50));

  if (!allSuccess) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
