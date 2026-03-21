import type { DiscoverCategory } from "@vibehub/content-contracts";

const LABELS: Record<DiscoverCategory, string> = {
  open_source: "Open source",
  skill: "Skill",
  plugin: "Plugin",
  os: "OS",
  website: "Website",
  event: "Event",
  contest: "Contest",
  news: "News",
  model: "Model",
  api: "API",
  sdk: "SDK",
  agent: "Agent",
  template: "Template",
  integration: "Integration",
  research: "Research",
  dataset: "Dataset",
  benchmark: "Benchmark",
  tutorial: "Tutorial",
  newsletter: "Newsletter",
  repo_list: "Repo list",
  job: "Job",
  grant: "Grant",
  community: "Community",
  asset: "Asset"
};

export function presentDiscoverCategory(category: DiscoverCategory) {
  return LABELS[category];
}
