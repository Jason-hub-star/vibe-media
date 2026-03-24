export type BriefStatus = "draft" | "review" | "scheduled" | "published";

export interface BriefListItem {
  slug: string;
  title: string;
  summary: string;
  status: BriefStatus;
  publishedAt: string | null;
  sourceCount: number;
  /** Derived: domain names extracted from sourceLinks */
  sourceDomains?: string[];
  /** Derived: estimated read time from body word count */
  readTimeMinutes?: number;
  /** Derived: first ~200 chars of body for hover preview */
  bodyPreview?: string;
  /** Editorial: one-sentence "why it matters" insight (requires DB column) */
  whyItMatters?: string;
  /** Editorial: topic tag for filtering (requires DB column) */
  topic?: string;
}

export interface BriefDetail extends BriefListItem {
  body: string[];
  sourceLinks: Array<{
    label: string;
    href: string;
  }>;
}
