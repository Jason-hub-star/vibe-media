export interface SourceEntry {
  id: string;
  label: string;
  category: "company" | "research" | "release";
  href: string;
  freshness: "daily" | "weekly";
}

export interface SourceDetail extends SourceEntry {
  runHistory: Array<{ runId: string; status: string; timestamp: string }>;
  reliability: number;
}
