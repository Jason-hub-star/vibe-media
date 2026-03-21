export interface SourceEntry {
  id: string;
  label: string;
  category: "company" | "research" | "release";
  href: string;
  freshness: "daily" | "weekly";
}
