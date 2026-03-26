/**
 * NotebookLM 오디오/비디오 다운로드 — Hover → Download 버튼 클릭
 *
 * Usage: npx tsx tools/nlm-download.ts <notebook-id> [output-dir]
 */

import { chromium } from "playwright";
import fs from "fs/promises";
import path from "path";
import os from "os";

const NLM_COOKIES_PATH = path.join(
  os.homedir(),
  "Library/Application Support/nlm/profiles/default/cookies.json",
);

const args = process.argv.slice(2);
const notebookId = args[0];
const outputDir = args[1] ?? `output/nlm-${Date.now()}`;

if (!notebookId) {
  console.error("Usage: npx tsx tools/nlm-download.ts <notebook-id> [output-dir]");
  process.exit(1);
}

await fs.mkdir(outputDir, { recursive: true });

// 쿠키 로드 + Playwright 셋업
const rawCookies: Record<string, string> = JSON.parse(
  await fs.readFile(NLM_COOKIES_PATH, "utf-8"),
);

const pwCookies = Object.entries(rawCookies).map(([name, value]) => {
  const isSecure = name.startsWith("__Secure-") || name.startsWith("__Host-");
  return {
    name,
    value: String(value),
    domain: name.startsWith("__Host-") ? "notebooklm.google.com" : ".google.com",
    path: "/",
    ...(isSecure ? { secure: true, sameSite: "None" as const } : {}),
  };
});

const browser = await chromium.launch({ headless: false, channel: "chrome" });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  acceptDownloads: true,
});
await context.addCookies(pwCookies);
const page = await context.newPage();

try {
  const url = `https://notebooklm.google.com/notebook/${notebookId}`;
  console.log(`Opening ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(8000);

  if (page.url().includes("accounts.google.com")) {
    console.error("Not authenticated. Run 'nlm login' first.");
    process.exit(1);
  }

  console.log("Authenticated!");

  // 스튜디오 아이템 위치 찾기 (오른쪽 패널, x > 900)
  const items = await page.evaluate(() => {
    const results: { text: string; x: number; y: number; w: number; h: number }[] = [];
    const seen = new Set<string>();
    const els = document.querySelectorAll("*");
    for (const el of els) {
      const text = el.textContent?.trim() ?? "";
      const rect = el.getBoundingClientRect();
      // 오른쪽 패널, 적절한 크기의 텍스트 요소 (제목)
      if (
        rect.x > 900 && rect.width > 100 && rect.width < 400 &&
        rect.height > 10 && rect.height < 60 &&
        text.length > 5 && text.length < 80 &&
        !seen.has(text) &&
        (text.includes("GPT") || text.includes("OpenAI") || text.includes("Mini"))
      ) {
        seen.add(text);
        results.push({
          text: text.slice(0, 50),
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2,
          w: rect.width,
          h: rect.height,
        });
      }
    }
    return results;
  });

  console.log(`Found ${items.length} studio items:`);
  for (const item of items) {
    console.log(`  "${item.text}" at (${Math.round(item.x)}, ${Math.round(item.y)})`);
  }

  const downloaded: string[] = [];
  let audioIndex = 0;

  for (const item of items) {
    console.log(`\nHovering: "${item.text}"`);

    // 아이템 위에 마우스 호버 → 다운로드 버튼 노출
    await page.mouse.move(item.x, item.y);
    await page.waitForTimeout(1500);

    // 호버 후 나타나는 버튼 찾기 (aria-label 또는 mat-icon 텍스트 "download")
    const dlBtn = page.locator(
      'button[aria-label*="다운로드"], button[aria-label*="download"], button[aria-label*="Download"], ' +
      'button:has-text("download"), button:has-text("file_download"), ' +
      'button[mattooltip*="다운로드"], button[mattooltip*="Download"]',
    );
    let dlCount = await dlBtn.count();

    // fallback: 호버 영역 근처의 모든 버튼 중 2번째 (이름바꾸기=1, 다운로드=2, 공유=3)
    if (dlCount === 0) {
      // 아이템 근처 (같은 y좌표 ±30px) 의 아이콘 버튼들 찾기
      const nearbyBtns = await page.evaluate((iy) => {
        return Array.from(document.querySelectorAll("button"))
          .filter((b) => {
            const r = b.getBoundingClientRect();
            return Math.abs(r.y - iy) < 30 && r.x > 900 && r.width < 50;
          })
          .map((b, i) => ({
            i,
            text: b.textContent?.trim().slice(0, 30) ?? "",
            x: b.getBoundingClientRect().x + b.getBoundingClientRect().width / 2,
            y: b.getBoundingClientRect().y + b.getBoundingClientRect().height / 2,
          }));
      }, item.y);

      console.log(`  Nearby icon buttons: ${nearbyBtns.length}`);
      for (const b of nearbyBtns) {
        console.log(`    "${b.text}" at (${Math.round(b.x)}, ${Math.round(b.y)})`);
      }

      // more_vert (⋮) 버튼 클릭 → 메뉴에서 "다운로드" 찾기
      const moreVert = nearbyBtns.find((b) => b.text.includes("more_vert"));
      if (moreVert) {
        console.log(`  Clicking ⋮ menu at (${Math.round(moreVert.x)}, ${Math.round(moreVert.y)})`);
        await page.mouse.click(moreVert.x, moreVert.y);
        await page.waitForTimeout(1000);

        // 메뉴 아이템에서 "다운로드" 찾기
        const menuDl = page.locator('[role="menuitem"]:has-text("다운로드"), [role="menuitem"]:has-text("Download"), [role="menuitem"]:has-text("download"), button:has-text("다운로드"), li:has-text("다운로드")');
        const menuDlCount = await menuDl.count();
        console.log(`  Menu "다운로드" items: ${menuDlCount}`);

        if (menuDlCount > 0) {
          // 다운로드 메뉴 클릭 → 파일 다운로드 대기
          try {
            const [download] = await Promise.all([
              page.waitForEvent("download", { timeout: 120000 }),
              menuDl.first().click(),
            ]);

            const suggested = download.suggestedFilename();
            const isVideo = suggested.includes("video") || suggested.endsWith(".mp4") || suggested.endsWith(".webm");
            const ext = isVideo ? "mp4" : "m4a";
            const type = isVideo ? "video" : "audio";
            const filename = isVideo
              ? "video-en.mp4"
              : audioIndex === 0
                ? "audio-en.m4a"
                : `audio-en-${audioIndex}.m4a`;
            if (!isVideo) audioIndex++;

            const filepath = path.join(outputDir, filename);
            await download.saveAs(filepath);
            const stat = await fs.stat(filepath);
            console.log(`  ✅ ${filename} (${(stat.size / 1024 / 1024).toFixed(1)}MB)`);
            downloaded.push(filename);
            dlCount = 1;
          } catch (dlErr) {
            console.log(`  ❌ Download error: ${dlErr instanceof Error ? dlErr.message.slice(0, 80) : dlErr}`);
          }
        } else {
          // 메뉴 스크린샷
          await page.screenshot({ path: path.join(outputDir, `menu-${item.text.slice(0, 10)}.png`) });
          console.log(`  No "다운로드" in menu. Screenshot saved.`);
          await page.keyboard.press("Escape");
        }
      }
    }

    console.log(`  Download buttons visible: ${dlCount}`);

    if (dlCount > 0) {
      try {
        const [download] = await Promise.all([
          page.waitForEvent("download", { timeout: 120000 }),
          dlBtn.first().click(),
        ]);

        const suggested = download.suggestedFilename();
        const isVideo = suggested.includes("video") || suggested.endsWith(".mp4");
        const ext = isVideo ? "mp4" : "m4a";
        const type = isVideo ? "video" : "audio";
        const filename = isVideo
          ? `video-en.mp4`
          : audioIndex === 0
            ? `audio-en.m4a`
            : `audio-en-${audioIndex}.m4a`;
        if (!isVideo) audioIndex++;

        const filepath = path.join(outputDir, filename);
        await download.saveAs(filepath);
        const stat = await fs.stat(filepath);
        console.log(`  ✅ ${filename} (${(stat.size / 1024 / 1024).toFixed(1)}MB)`);
        downloaded.push(filename);
      } catch (e) {
        console.log(`  ❌ Download error: ${e instanceof Error ? e.message.slice(0, 80) : e}`);
      }
    } else {
      // 스크린샷으로 현재 상태 확인
      await page.screenshot({ path: path.join(outputDir, `hover-${item.text.slice(0, 10)}.png`) });
      console.log(`  No download button. Screenshot saved.`);
    }
  }

  console.log("\n" + "═".repeat(50));
  console.log(`📥 Downloaded: ${downloaded.length}/${items.length} files`);
  for (const f of downloaded) {
    const stat = await fs.stat(path.join(outputDir, f));
    console.log(`  ✅ ${f} (${(stat.size / 1024 / 1024).toFixed(1)}MB)`);
  }
  if (downloaded.length === 0) {
    console.log("  ❌ No files. Check hover screenshots in output dir.");
  }
  console.log("═".repeat(50));

} finally {
  await browser.close();
}
