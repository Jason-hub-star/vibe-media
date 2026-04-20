import type {
  DiscoverDraftShadowTrialFixture,
  DiscoverDraftShadowTrialPrediction
} from "./discover-draft-shadow-trial-fixtures";
import { discoverDraftShadowTrialFixtures } from "./discover-draft-shadow-trial-fixtures";

export const DISCOVER_DRAFT_SHADOW_MINIMUM_SAMPLE_COUNT = 20;

export interface DiscoverDraftShadowTrialReport {
  performedAt: string;
  stage: "discover draft";
  mode: "hybrid";
  activeProvider: "ollama";
  activeModel: "vibehub-discover-draft-g4";
  candidateProvider: "anthropic";
  candidateModel: "claude-sonnet-4-6";
  sampleCount: number;
  minimumSampleCount: number;
  remainingSamples: number;
  sourceSet: string[];
  metrics: {
    active: TrialMetrics;
    candidate: TrialMetrics;
  };
  outcome: {
    result: "keep active" | "promote candidate" | "need more samples";
    notes: string[];
    nextAction: string;
  };
}

interface TrialMetrics {
  taskSuccessRate: number;
  confidenceStability: number;
  p95LatencyMs: number;
  remoteDelegationDrift: number;
  searchOverTrigger: number;
  memoryFalsePositiveDrift: number;
  exceptionQueueInflow: number;
}

function toPercent(value: number) {
  return Number((value * 100).toFixed(1));
}

function calculateP95(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);

  return sorted[index] ?? 0;
}

function isSuccessfulDraft(
  fixture: DiscoverDraftShadowTrialFixture,
  prediction: DiscoverDraftShadowTrialPrediction
) {
  return (
    prediction.categoryScore >= 0.9 &&
    prediction.actionLinkQualityScore >= 0.88 &&
    prediction.ctaClarityScore >= 0.88 &&
    Math.abs(prediction.summaryLength - fixture.expected.summaryLengthTarget) <= 12 &&
    !prediction.brokenActionLink &&
    !prediction.genericSummary &&
    !prediction.irrelevantCta
  );
}

function hasException(prediction: DiscoverDraftShadowTrialPrediction) {
  return (
    prediction.confidence < 0.85 ||
    prediction.brokenActionLink ||
    prediction.genericSummary ||
    prediction.irrelevantCta
  );
}

function buildMetrics(
  fixtures: DiscoverDraftShadowTrialFixture[],
  pick: (fixture: DiscoverDraftShadowTrialFixture) => DiscoverDraftShadowTrialPrediction
): TrialMetrics {
  const successes = fixtures.filter((fixture) => isSuccessfulDraft(fixture, pick(fixture))).length;
  const stableConfidence = fixtures.filter((fixture) => {
    const prediction = pick(fixture);
    return Math.abs(prediction.confidence - fixture.expected.confidence) <= 0.08;
  }).length;
  const remoteDelegations = fixtures.filter((fixture) => pick(fixture).remoteDelegationTriggered).length;
  const searchTriggers = fixtures.filter((fixture) => pick(fixture).searchTriggered).length;
  const memoryFalsePositives = fixtures.filter((fixture) => pick(fixture).memoryFalsePositive).length;
  const exceptionInflows = fixtures.filter((fixture) => hasException(pick(fixture))).length;

  return {
    taskSuccessRate: toPercent(successes / fixtures.length),
    confidenceStability: toPercent(stableConfidence / fixtures.length),
    p95LatencyMs: calculateP95(fixtures.map((fixture) => pick(fixture).latencyMs)),
    remoteDelegationDrift: toPercent(remoteDelegations / fixtures.length),
    searchOverTrigger: toPercent(searchTriggers / fixtures.length),
    memoryFalsePositiveDrift: toPercent(memoryFalsePositives / fixtures.length),
    exceptionQueueInflow: toPercent(exceptionInflows / fixtures.length)
  };
}

function determineOutcome(active: TrialMetrics, candidate: TrialMetrics, sampleCount: number) {
  if (sampleCount < DISCOVER_DRAFT_SHADOW_MINIMUM_SAMPLE_COUNT) {
    return {
      result: "need more samples" as const,
      notes: ["The stage has not yet reached the 20-item promote gate."],
      nextAction: "Add more adjudicated discover draft samples and rerun the trial."
    };
  }

  if (
    candidate.taskSuccessRate >= active.taskSuccessRate &&
    candidate.exceptionQueueInflow <= active.exceptionQueueInflow
  ) {
    return {
      result: "promote candidate" as const,
      notes: [
        "Candidate improved discover category fit and CTA quality without increasing exceptions.",
        "The 20-item gate is satisfied for the discover-draft stage."
      ],
      nextAction: "Record the promote decision and open the critic shadow trial."
    };
  }

  return {
    result: "keep active" as const,
    notes: ["Candidate did not clear the discover-draft promote gate against the active baseline."],
    nextAction: "Collect more samples and review broken-link or generic-summary failures before another promote check."
  };
}

export function runDiscoverDraftShadowTrial(
  fixtures: DiscoverDraftShadowTrialFixture[] = discoverDraftShadowTrialFixtures,
  performedAt = "2026-03-22T09:10:00.000Z"
): DiscoverDraftShadowTrialReport {
  const active = buildMetrics(fixtures, (fixture) => fixture.activePrediction);
  const candidate = buildMetrics(fixtures, (fixture) => fixture.candidatePrediction);

  return {
    performedAt,
    stage: "discover draft",
    mode: "hybrid",
    activeProvider: "ollama",
    activeModel: "vibehub-discover-draft-g4",
    candidateProvider: "anthropic",
    candidateModel: "claude-sonnet-4-6",
    sampleCount: fixtures.length,
    minimumSampleCount: DISCOVER_DRAFT_SHADOW_MINIMUM_SAMPLE_COUNT,
    remainingSamples: Math.max(0, DISCOVER_DRAFT_SHADOW_MINIMUM_SAMPLE_COUNT - fixtures.length),
    sourceSet: Array.from(new Set(fixtures.map((fixture) => fixture.sourceName))),
    metrics: { active, candidate },
    outcome: determineOutcome(active, candidate, fixtures.length)
  };
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function renderDiscoverDraftShadowTrialLog(report: DiscoverDraftShadowTrialReport) {
  return [
    "### Trial",
    `- date: ${report.performedAt}`,
    `- stage: ${report.stage}`,
    `- mode: ${report.mode}`,
    `- active provider: ${report.activeProvider}`,
    `- active model: ${report.activeModel}`,
    `- candidate provider: ${report.candidateProvider}`,
    `- candidate model: ${report.candidateModel}`,
    `- sample count: ${report.sampleCount} / ${report.minimumSampleCount}`,
    `- source set: ${report.sourceSet.join(", ")}`,
    "- target surface: `discover`, `both`",
    "",
    "### Metrics",
    `- task success rate: active ${formatPercent(report.metrics.active.taskSuccessRate)}, candidate ${formatPercent(report.metrics.candidate.taskSuccessRate)}`,
    `- confidence stability: active ${formatPercent(report.metrics.active.confidenceStability)}, candidate ${formatPercent(report.metrics.candidate.confidenceStability)}`,
    `- p95 latency: active ${report.metrics.active.p95LatencyMs}ms, candidate ${report.metrics.candidate.p95LatencyMs}ms`,
    `- remote delegation drift: active ${formatPercent(report.metrics.active.remoteDelegationDrift)}, candidate ${formatPercent(report.metrics.candidate.remoteDelegationDrift)}`,
    `- search over-trigger: active ${formatPercent(report.metrics.active.searchOverTrigger)}, candidate ${formatPercent(report.metrics.candidate.searchOverTrigger)}`,
    `- memory false positive drift: active ${formatPercent(report.metrics.active.memoryFalsePositiveDrift)}, candidate ${formatPercent(report.metrics.candidate.memoryFalsePositiveDrift)}`,
    `- exception queue inflow: active ${formatPercent(report.metrics.active.exceptionQueueInflow)}, candidate ${formatPercent(report.metrics.candidate.exceptionQueueInflow)}`,
    "",
    "### Outcome",
    `- result: ${report.outcome.result}`,
    `- notes: ${report.outcome.notes.join(" ")}`,
    `- next action: ${report.outcome.nextAction}`
  ].join("\n");
}
