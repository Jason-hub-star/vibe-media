/**
 * CLI: tsx run-video-locale-fanout.ts <slug> [--locales=en,es] [--dry-run]
 *
 * brief 1건 → locale별 SRT 생성 + 비디오 렌더 job 등록.
 * 흐름: NotebookLM 오디오(en) → Whisper STT → en SRT → Gemini 번역 → es SRT
 *       → Remotion 렌더 × N (같은 오디오, 다른 자막)
 */

import fs from "fs/promises";
import path from "path";
import { DEFAULT_TARGET_LOCALES } from "@vibehub/content-contracts";
import { generateLocaleSrts } from "@vibehub/media-engine/src/stt/locale-srt-pipeline";
import { transcribeToSrt } from "@vibehub/media-engine/src/stt/whisper-stt";

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
const localesArg = args.find((a) => a.startsWith("--locales="))?.split("=")[1];
const targetLocales = localesArg
  ? localesArg.split(",").map((l) => l.trim())
  : DEFAULT_TARGET_LOCALES;

if (!slug) {
  console.error("usage: tsx run-video-locale-fanout.ts <slug> [--locales=en,es] [--dry-run]");
  process.exit(1);
}

const outputDir = `output/${slug}`;
const audioPath = path.join(outputDir, "audio.m4a");

// ---------------------------------------------------------------------------
// Step 1: 오디오 확인
// ---------------------------------------------------------------------------

try {
  await fs.access(audioPath);
} catch {
  console.error(`Audio file not found: ${audioPath}`);
  console.error("Run the audio pipeline first to generate the NotebookLM M4A.");
  process.exit(1);
}

console.log(`Video locale fan-out: "${slug}" → [${targetLocales.join(", ")}]${dryRun ? " [DRY RUN]" : ""}`);

// ---------------------------------------------------------------------------
// Step 2: Whisper STT → en SRT
// ---------------------------------------------------------------------------

const enSrtPath = path.join(outputDir, "subtitles-en.srt");
let needsTranscription = false;

try {
  await fs.access(enSrtPath);
  console.log(`English SRT exists: ${enSrtPath}`);
} catch {
  needsTranscription = true;
}

if (needsTranscription) {
  console.log("Transcribing audio with Whisper...");
  const whisperResult = await transcribeToSrt(audioPath, outputDir, {
    model: "base",
    language: "en",
  });

  if (!whisperResult.success) {
    console.error(`Whisper STT failed: ${whisperResult.error}`);
    process.exit(1);
  }
  console.log(`English SRT generated: ${whisperResult.srtPath}`);
}

// ---------------------------------------------------------------------------
// Step 3: locale별 SRT 번역
// ---------------------------------------------------------------------------

const nonEnLocales = targetLocales.filter((l) => l !== "en");

if (nonEnLocales.length === 0) {
  console.log("No non-English locales to translate. Done.");
  process.exit(0);
}

if (dryRun) {
  console.log(`\n[DRY RUN] Would translate SRT to: ${nonEnLocales.join(", ")}`);
  console.log("[DRY RUN] Would create Remotion render jobs for each locale.");
  process.exit(0);
}

console.log(`\nTranslating SRT to: ${nonEnLocales.join(", ")}...`);

const srtResults = await generateLocaleSrts({
  sourceSrtPath: enSrtPath,
  outputDir,
  targetLocales: nonEnLocales,
});

// ---------------------------------------------------------------------------
// 결과 보고
// ---------------------------------------------------------------------------

console.log("\n--- SRT Fan-out Results ---");
for (const r of srtResults) {
  if (r.success) {
    console.log(`  ✅ ${r.locale}: ${r.entryCount} entries → ${r.srtPath}`);
  } else {
    console.log(`  ❌ ${r.locale}: ${r.error}`);
  }
}

const allSuccess = srtResults.every((r) => r.success);
console.log(`\n${allSuccess ? "✅" : "⚠️"} SRT generation complete.`);

// YouTube metadata에 locale별 SRT 경로 출력
console.log("\n--- YouTube Metadata ---");
console.log(`Audio: ${audioPath}`);
console.log(`Subtitles:`);
console.log(`  en: ${enSrtPath}`);
for (const r of srtResults.filter((r) => r.success)) {
  console.log(`  ${r.locale}: ${r.srtPath}`);
}

process.exit(allSuccess ? 0 : 1);
