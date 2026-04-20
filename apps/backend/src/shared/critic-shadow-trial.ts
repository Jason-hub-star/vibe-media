import type { CriticShadowTrialFixture, CriticShadowTrialPrediction } from "./critic-shadow-trial-fixtures";
import { criticShadowTrialFixtures } from "./critic-shadow-trial-fixtures";

export const CRITIC_SHADOW_MINIMUM_SAMPLE_COUNT = 25;

export interface CriticShadowTrialReport {
  performedAt: string;
  stage: "critic";
  mode: "hybrid";
  activeProvider: "ollama";
  activeModel: "gemma4:26b-a4b-it-q4_K_M";
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

function isSuccessfulCriticDecision(
  fixture: CriticShadowTrialFixture,
  prediction: CriticShadowTrialPrediction
) {
  const expectedDecision = fixture.expected.shouldBlock ? "block" : "pass";

  return prediction.decision === expectedDecision && !prediction.falsePositiveFlag && !prediction.missedPolicyRisk;
}

function hasException(prediction: CriticShadowTrialPrediction) {
  return prediction.confidence < 0.85 || prediction.falsePositiveFlag || prediction.missedPolicyRisk;
}

function buildMetrics(
  fixtures: CriticShadowTrialFixture[],
  pick: (fixture: CriticShadowTrialFixture) => CriticShadowTrialPrediction
): TrialMetrics {
  const successes = fixtures.filter((fixture) => isSuccessfulCriticDecision(fixture, pick(fixture))).length;
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
  if (sampleCount < CRITIC_SHADOW_MINIMUM_SAMPLE_COUNT) {
    return {
      result: "need more samples" as const,
      notes: ["The stage has not yet reached the 25-item promote gate."],
      nextAction: "Add more adjudicated critic samples and rerun the trial."
    };
  }

  if (
    candidate.taskSuccessRate >= active.taskSuccessRate &&
    candidate.exceptionQueueInflow <= active.exceptionQueueInflow
  ) {
    return {
      result: "promote candidate" as const,
      notes: [
        "Candidate improved critic precision without increasing false positives or exception inflow.",
        "The 25-item gate is satisfied for the critic stage."
      ],
      nextAction: "Record the promote decision and move to the orchestration mode comparison."
    };
  }

  return {
    result: "keep active" as const,
    notes: ["Candidate did not clear the critic promote gate against the active baseline."],
    nextAction: "Collect more samples and inspect missed-policy or false-positive disagreements before another promote check."
  };
}

export function runCriticShadowTrial(
  fixtures: CriticShadowTrialFixture[] = criticShadowTrialFixtures,
  performedAt = "2026-03-22T09:20:00.000Z"
): CriticShadowTrialReport {
  const active = buildMetrics(fixtures, (fixture) => fixture.activePrediction);
  const candidate = buildMetrics(fixtures, (fixture) => fixture.candidatePrediction);

  return {
    performedAt,
    stage: "critic",
    mode: "hybrid",
    activeProvider: "ollama",
    activeModel: "gemma4:26b-a4b-it-q4_K_M",
    candidateProvider: "anthropic",
    candidateModel: "claude-sonnet-4-6",
    sampleCount: fixtures.length,
    minimumSampleCount: CRITIC_SHADOW_MINIMUM_SAMPLE_COUNT,
    remainingSamples: Math.max(0, CRITIC_SHADOW_MINIMUM_SAMPLE_COUNT - fixtures.length),
    sourceSet: Array.from(new Set(fixtures.map((fixture) => fixture.sourceName))),
    metrics: { active, candidate },
    outcome: determineOutcome(active, candidate, fixtures.length)
  };
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function renderCriticShadowTrialLog(report: CriticShadowTrialReport) {
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
    "- target surface: `brief`, `discover`, `both`",
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
