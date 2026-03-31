import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import PptxGenJS from "pptxgenjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const rootDir = path.resolve(__dirname, "..", "..");
export const outDir = path.join(rootDir, "output", "presentation");
export const outFile = path.join(outDir, "vibehub-media-project-intro.pptx");

export const C = {
  ink: "151110",
  inkSoft: "241D1A",
  cream: "F2ECDF",
  creamMuted: "DDD2BF",
  orange: "D9863A",
  mint: "8FCFBE",
  yellow: "D7BC62",
  rose: "C97A8D",
  sky: "92ABD8",
  purple: "A88FD0",
  border: "1E1A18",
  white: "FFFFFF",
};

export const FONT = {
  display: "Georgia",
  body: "Trebuchet MS",
  mono: "Courier New",
};

export const slideWidth = 13.333;
export const slideHeight = 7.5;

const assetData = (relativePath) =>
  `data:image/svg+xml;base64,${fs.readFileSync(path.join(rootDir, relativePath)).toString("base64")}`;

export const assets = {
  logoWordmark: assetData("apps/web/public/brand/logo-wordmark.svg"),
  logoMark: assetData("apps/web/public/brand/logo-mark.svg"),
  orbitGrid: assetData("apps/web/public/sprites/orbit-grid.svg"),
};

export function createDeck() {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "OpenAI Codex";
  pptx.company = "VibeHub Media";
  pptx.subject = "Project intro deck grounded in repository docs and automations";
  pptx.title = "VibeHub Media Project Intro";
  return pptx;
}

export function addBase(slide, accent = C.orange) {
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: slideWidth,
    h: slideHeight,
    line: { color: C.cream, transparency: 100 },
    fill: { color: C.cream },
  });
  slide.addShape("ellipse", {
    x: 10.05,
    y: -1.1,
    w: 4.1,
    h: 4.1,
    line: { color: accent, transparency: 100 },
    fill: { color: accent, transparency: 73 },
  });
  slide.addShape("ellipse", {
    x: -0.8,
    y: 5.85,
    w: 2.6,
    h: 2.6,
    line: { color: C.sky, transparency: 100 },
    fill: { color: C.sky, transparency: 82 },
  });
  slide.addImage({ data: assets.orbitGrid, x: 9.05, y: 0.15, w: 3.9, h: 3.9 });
  slide.addShape("line", {
    x: 0.7,
    y: 6.98,
    w: 11.95,
    h: 0,
    line: { color: C.border, transparency: 72, pt: 1.1 },
  });
}

export function addPill(slide, x, y, w, text, fill, color = C.ink) {
  slide.addShape("roundRect", {
    x,
    y,
    w,
    h: 0.34,
    rectRadius: 0.08,
    line: { color: fill, transparency: 100 },
    fill: { color: fill },
  });
  slide.addText(text, {
    x: x + 0.08,
    y: y + 0.04,
    w: w - 0.16,
    h: 0.18,
    fontFace: FONT.body,
    fontSize: 8.5,
    bold: true,
    color,
    margin: 0,
    align: "center",
  });
}

export function addHeader(slide, eyebrow, title, subtitle) {
  addPill(slide, 0.72, 0.52, 1.95, eyebrow, C.orange, C.white);
  slide.addText(title, {
    x: 0.7,
    y: 0.98,
    w: 7.7,
    h: 0.55,
    fontFace: FONT.display,
    fontSize: 24,
    bold: true,
    color: C.ink,
    margin: 0,
  });
  slide.addText(subtitle, {
    x: 0.72,
    y: 1.62,
    w: 8.9,
    h: 0.4,
    fontFace: FONT.body,
    fontSize: 11,
    color: C.inkSoft,
    margin: 0,
  });
}

export function addCard(slide, { x, y, w, h, title, body, fill = C.white, accent = C.border, number }) {
  slide.addShape("roundRect", {
    x,
    y,
    w,
    h,
    rectRadius: 0.14,
    line: { color: accent, transparency: 70, pt: 1.4 },
    fill: { color: fill },
    shadow: { type: "outer", color: "BFB6A6", blur: 2, angle: 45, distance: 1, opacity: 0.12 },
  });
  if (number) {
    slide.addText(number, {
      x: x + 0.15,
      y: y + 0.1,
      w: 0.55,
      h: 0.28,
      fontFace: FONT.mono,
      fontSize: 12,
      bold: true,
      color: accent,
      margin: 0,
    });
  }
  slide.addText(title, {
    x: x + 0.16,
    y: y + 0.34,
    w: w - 0.32,
    h: 0.34,
    fontFace: FONT.body,
    fontSize: 14.5,
    bold: true,
    color: C.ink,
    margin: 0,
  });
  slide.addText(body, {
    x: x + 0.16,
    y: y + 0.74,
    w: w - 0.32,
    h: h - 0.92,
    fontFace: FONT.body,
    fontSize: 10.5,
    color: C.inkSoft,
    margin: 0,
    breakLine: false,
    valign: "top",
  });
}

export function addMetric(slide, x, y, value, label, accent) {
  slide.addShape("roundRect", {
    x,
    y,
    w: 1.9,
    h: 1.1,
    rectRadius: 0.12,
    line: { color: accent, transparency: 74, pt: 1.1 },
    fill: { color: C.white },
  });
  slide.addText(value, {
    x: x + 0.12,
    y: y + 0.12,
    w: 1.66,
    h: 0.38,
    fontFace: FONT.display,
    fontSize: 20,
    bold: true,
    color: C.ink,
    margin: 0,
    align: "center",
  });
  slide.addText(label, {
    x: x + 0.12,
    y: y + 0.64,
    w: 1.66,
    h: 0.18,
    fontFace: FONT.body,
    fontSize: 9.5,
    color: C.inkSoft,
    margin: 0,
    align: "center",
  });
}

export function footer(slide, page) {
  slide.addText(`VibeHub Media Project Intro  |  ${page}`, {
    x: 0.78,
    y: 7.05,
    w: 3.3,
    h: 0.18,
    fontFace: FONT.mono,
    fontSize: 8.5,
    color: C.inkSoft,
    margin: 0,
  });
}

export async function writeDeck(pptx) {
  fs.mkdirSync(outDir, { recursive: true });
  await pptx.writeFile({ fileName: outFile, compression: true });
  console.log(`Wrote ${path.relative(rootDir, outFile)}`);
}
