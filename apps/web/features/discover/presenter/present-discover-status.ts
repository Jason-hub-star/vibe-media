type DiscoverStatus = "featured" | "watching" | "tracked";

const LABELS: Record<DiscoverStatus, string> = {
  featured: "Featured",
  watching: "Watching",
  tracked: "Tracked"
};

const STYLE: Record<DiscoverStatus, string> = {
  featured: "mint",
  watching: "yellow",
  tracked: "sky"
};

export function presentDiscoverStatus(status: DiscoverStatus) {
  return { label: LABELS[status], style: STYLE[status] };
}
