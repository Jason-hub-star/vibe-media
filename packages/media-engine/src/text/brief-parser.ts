/** Brief text parser — markdown to structured sections. */

import type { GenerationResult, GenerationResultSection } from "../types";

export interface BriefParseOptions {
  defaultStyleKey?: string;
}

export function parseBrief(
  text: string,
  options?: BriefParseOptions
): GenerationResult {
  const styleKey = options?.defaultStyleKey ?? "default";
  const trimmed = text.trim();

  if (!trimmed) {
    return { sections: [] };
  }

  const blocks = splitIntoBlocks(trimmed);

  const sections: GenerationResultSection[] = blocks.map((block, i) => {
    const { headline, body } = extractHeadlineAndBody(block, i + 1);
    return {
      headline,
      body,
      imageSlot: `slot-${i + 1}`,
      styleKey,
    };
  });

  return { sections };
}

function splitIntoBlocks(text: string): string[] {
  const hasHeadings = /^#{1,2}\s+/m.test(text);

  if (hasHeadings) {
    return splitByHeadings(text);
  }

  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);

  if (blocks.length > 0) {
    return blocks;
  }

  return [text];
}

function splitByHeadings(text: string): string[] {
  const lines = text.split("\n");
  const blocks: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (/^#{1,2}\s+/.test(line)) {
      const prev = current.join("\n").trim();
      if (prev) blocks.push(prev);
      current = [line];
    } else {
      current.push(line);
    }
  }

  const last = current.join("\n").trim();
  if (last) blocks.push(last);

  return blocks;
}

function extractHeadlineAndBody(
  block: string,
  sectionIndex: number
): { headline: string; body: string } {
  const lines = block.split("\n");
  const firstLine = lines[0].trim();

  const headingMatch = firstLine.match(/^#{1,2}\s+(.+)/);
  if (headingMatch) {
    const headline = headingMatch[1].trim();
    const body = lines.slice(1).join("\n").trim();

    if (!body) {
      return { headline: `Section ${sectionIndex}`, body: headline };
    }
    return { headline, body };
  }

  const restBody = lines.slice(1).join("\n").trim();

  if (!restBody) {
    return { headline: `Section ${sectionIndex}`, body: firstLine };
  }

  return { headline: firstLine, body: restBody };
}
