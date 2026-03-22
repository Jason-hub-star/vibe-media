import type { ClassifierShadowTrialFixture } from "./classifier-shadow-trial-fixture-types";
import { createClassifierShadowTrialFixture } from "./classifier-shadow-trial-fixture-builders";

export const classifierShadowTrialBaseFixtures: ClassifierShadowTrialFixture[] = [
  createClassifierShadowTrialFixture({
    id: "trial-openai-agents-sdk",
    sourceName: "OpenAI News",
    sourceTier: "auto-safe",
    title: "OpenAI Agents SDK update",
    parsedSummary: "SDK release note with platform impact, new entrypoints, and direct docs links.",
    tags: ["sdk", "release", "platform"],
    dedupeKey: "openai-agents-sdk-update",
    expected: {
      targetSurface: "both",
      category: "sdk",
      adjudicatedConfidence: 0.9,
      rationale: "Major SDK release should land in both the Korean brief and discover registry.",
      searchRequired: false
    },
    activePrediction: { targetSurface: "discover", category: "open_source", confidence: 0.84, latencyMs: 180 },
    candidatePrediction: { confidence: 0.91, latencyMs: 420 }
  }),
  createClassifierShadowTrialFixture({
    id: "trial-openai-api-changelog",
    sourceName: "OpenAI API Changelog",
    sourceTier: "auto-safe",
    title: "OpenAI API changelog adds new rate-limit controls",
    parsedSummary: "Platform changelog with API-level operational guidance and migration notes.",
    tags: ["api", "platform", "release"],
    dedupeKey: "openai-api-rate-limit-controls",
    expected: {
      targetSurface: "both",
      category: "api",
      adjudicatedConfidence: 0.88,
      rationale: "Operational API changes warrant both discover CTA links and a brief explainer.",
      searchRequired: false
    },
    activePrediction: { targetSurface: "brief", confidence: 0.86 },
    candidatePrediction: { confidence: 0.9, latencyMs: 390 }
  }),
  createClassifierShadowTrialFixture({
    id: "trial-anthropic-research",
    sourceName: "Anthropic Research",
    sourceTier: "auto-safe",
    title: "Anthropic evaluation practice note",
    parsedSummary: "Research note with operational evaluation guidance and limited CTA value.",
    tags: ["research", "evaluation"],
    dedupeKey: "anthropic-eval-practice-note",
    expected: {
      targetSurface: "brief",
      category: "research",
      adjudicatedConfidence: 0.9,
      rationale: "High explanatory value for the brief lane, but not a strong discover CTA.",
      searchRequired: false
    },
    activePrediction: { confidence: 0.92, latencyMs: 150 },
    candidatePrediction: { confidence: 0.89, latencyMs: 360, remoteDelegationTriggered: true, searchTriggered: true }
  }),
  createClassifierShadowTrialFixture({
    id: "trial-google-ai-blog",
    sourceName: "Google AI Blog",
    sourceTier: "auto-safe",
    title: "Google AI workflow post for developer teams",
    parsedSummary: "Official post explaining applied workflow changes with few direct action links.",
    tags: ["research", "workflow"],
    dedupeKey: "google-ai-workflow-post",
    expected: {
      targetSurface: "brief",
      category: "research",
      adjudicatedConfidence: 0.87,
      rationale: "Useful as a summarized brief, not primarily a discover item.",
      searchRequired: false
    },
    activePrediction: { confidence: 0.85, latencyMs: 155 },
    candidatePrediction: { confidence: 0.86, latencyMs: 340 }
  }),
  createClassifierShadowTrialFixture({
    id: "trial-github-release",
    sourceName: "GitHub Releases",
    sourceTier: "auto-safe",
    title: "Tracked repo release for local agent tooling",
    parsedSummary: "Release notes with clear repo and docs actions but limited narrative depth.",
    tags: ["open-source", "repo", "release"],
    dedupeKey: "tracked-repo-release-local-agent-tooling",
    expected: {
      targetSurface: "discover",
      category: "open_source",
      adjudicatedConfidence: 0.89,
      rationale: "This is a clean discover item with immediate outbound actions.",
      searchRequired: false
    },
    activePrediction: { confidence: 0.87, latencyMs: 145 },
    candidatePrediction: { confidence: 0.9, latencyMs: 300 }
  }),
  createClassifierShadowTrialFixture({
    id: "trial-github-trending",
    sourceName: "GitHub Trending",
    sourceTier: "render-required",
    title: "Crawl4AI trends in developer workflows",
    parsedSummary: "Popular repo with direct visit/download value and limited need for long-form analysis.",
    tags: ["open-source", "tool", "repo"],
    dedupeKey: "crawl4ai-trending-developer-workflows",
    expected: {
      targetSurface: "discover",
      category: "open_source",
      adjudicatedConfidence: 0.86,
      rationale: "Fits the radar lane with strong outbound actions and low brief priority.",
      searchRequired: false
    },
    activePrediction: { confidence: 0.88, latencyMs: 175 },
    candidatePrediction: { confidence: 0.87, latencyMs: 370 }
  }),
  createClassifierShadowTrialFixture({
    id: "trial-product-hunt",
    sourceName: "Product Hunt AI",
    sourceTier: "render-required",
    title: "New AI workflow website launch",
    parsedSummary: "Launch card with outbound CTA value and only a short descriptive blurb.",
    tags: ["website", "launch", "tool"],
    dedupeKey: "product-hunt-ai-workflow-website-launch",
    expected: {
      targetSurface: "discover",
      category: "website",
      adjudicatedConfidence: 0.86,
      rationale: "Website launch belongs in discover with direct action links.",
      searchRequired: false
    },
    activePrediction: { category: "open_source", confidence: 0.82, latencyMs: 190, memoryFalsePositive: true },
    candidatePrediction: { confidence: 0.88, latencyMs: 410 }
  }),
  createClassifierShadowTrialFixture({
    id: "trial-devpost",
    sourceName: "Devpost",
    sourceTier: "render-required",
    title: "Agent builder challenge opens applications",
    parsedSummary: "Competition page with deadline, eligibility, and direct apply CTA.",
    tags: ["contest", "event", "apply"],
    dedupeKey: "devpost-agent-builder-challenge",
    expected: {
      targetSurface: "discover",
      category: "contest",
      adjudicatedConfidence: 0.85,
      rationale: "Contest pages should route into discover with a clean apply action.",
      searchRequired: false
    },
    activePrediction: { category: "event", confidence: 0.84, latencyMs: 200, searchTriggered: true },
    candidatePrediction: { confidence: 0.86, latencyMs: 430 }
  }),
  createClassifierShadowTrialFixture({
    id: "trial-transcript-mirror",
    sourceName: "Transcript Mirror",
    sourceTier: "manual-review-required",
    title: "Andrej Karpathy on code agents and AutoResearch",
    parsedSummary: "Long transcript with explanation value but quote-boundary and provenance risk.",
    tags: ["analysis", "transcript"],
    dedupeKey: "karpathy-code-agents-autoresearch",
    expected: {
      targetSurface: "brief",
      category: "research",
      adjudicatedConfidence: 0.79,
      rationale: "Still a brief candidate, but manual review must remain in the loop.",
      searchRequired: false
    },
    activePrediction: { confidence: 0.81, latencyMs: 160 },
    candidatePrediction: { confidence: 0.84, latencyMs: 390 }
  }),
  createClassifierShadowTrialFixture({
    id: "trial-duplicate-release",
    sourceName: "GitHub Release Mirror",
    sourceTier: "auto-safe",
    title: "Duplicate release mirror",
    parsedSummary: "Mirror post of a release already covered by the tracked repo source.",
    tags: ["repo", "release", "duplicate"],
    dedupeKey: "duplicate-release-mirror",
    expected: {
      targetSurface: "discard",
      category: "duplicate",
      adjudicatedConfidence: 0.93,
      rationale: "Duplicate mirrors should exit the pipeline early.",
      searchRequired: false
    },
    activePrediction: { targetSurface: "archive", category: "reference", confidence: 0.78, latencyMs: 170, memoryFalsePositive: true },
    candidatePrediction: { confidence: 0.89, latencyMs: 365 }
  }),
  createClassifierShadowTrialFixture({
    id: "trial-archive-memo",
    sourceName: "Anthropic Research",
    sourceTier: "auto-safe",
    title: "Archived research memo",
    parsedSummary: "Reference memo worth preserving internally but not promoting publicly.",
    tags: ["research", "reference"],
    dedupeKey: "archived-research-memo",
    expected: {
      targetSurface: "archive",
      category: "reference",
      adjudicatedConfidence: 0.91,
      rationale: "Useful for internal memory, but not a public brief or radar item.",
      searchRequired: false
    },
    activePrediction: { confidence: 0.9, latencyMs: 140 },
    candidatePrediction: { targetSurface: "brief", category: "research", confidence: 0.83, latencyMs: 345 }
  })
];
