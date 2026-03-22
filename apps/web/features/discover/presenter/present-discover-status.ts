type DiscoverStatus = "featured" | "watching" | "tracked";

const LABELS: Record<DiscoverStatus, string> = {
  featured: "추천",
  watching: "주목 중",
  tracked: "수집 중"
};

const STYLE: Record<DiscoverStatus, string> = {
  featured: "mint",
  watching: "yellow",
  tracked: "sky"
};

export function presentDiscoverStatus(status: DiscoverStatus) {
  return { label: LABELS[status], style: STYLE[status] };
}
