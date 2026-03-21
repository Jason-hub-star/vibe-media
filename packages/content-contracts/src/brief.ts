export type BriefStatus = "draft" | "review" | "scheduled" | "published";

export interface BriefListItem {
  slug: string;
  title: string;
  summary: string;
  status: BriefStatus;
  publishedAt: string | null;
  sourceCount: number;
}

export interface BriefDetail extends BriefListItem {
  body: string[];
  sourceLinks: Array<{
    label: string;
    href: string;
  }>;
}
