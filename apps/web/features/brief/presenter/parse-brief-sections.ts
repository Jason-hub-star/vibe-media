export interface BriefSection {
  heading: string | null;
  paragraphs: string[];
}

/**
 * Parse body paragraphs into labelled sections.
 * Lines starting with "## " begin a new section.
 * Current pipeline data has no headings → single section, same as before.
 */
export function parseBriefSections(body: string[]): BriefSection[] {
  const sections: BriefSection[] = [];
  let current: BriefSection = { heading: null, paragraphs: [] };

  for (const line of body) {
    if (line.startsWith("## ")) {
      if (current.paragraphs.length > 0 || current.heading) {
        sections.push(current);
      }
      current = { heading: line.slice(3).trim(), paragraphs: [] };
    } else {
      current.paragraphs.push(line);
    }
  }

  if (current.paragraphs.length > 0 || current.heading) {
    sections.push(current);
  }

  return sections;
}
