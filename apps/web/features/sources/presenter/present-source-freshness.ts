export function presentSourceFreshness(value: "daily" | "weekly") {
  return value === "daily" ? "Daily watch" : "Weekly watch";
}
