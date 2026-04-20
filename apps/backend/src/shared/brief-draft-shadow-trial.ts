import type {
  BriefDraftShadowTrialFixture,
  BriefDraftShadowTrialPrediction
} from "./brief-draft-shadow-trial-fixtures";
import { briefDraftShadowTrialFixtures } from "./brief-draft-shadow-trial-fixtures";

export const BRIEF_DRAFT_SHADOW_MINIMUM_SAMPLE_COUNT = 20;

export interface BriefDraftShadowTrialReport {
  performedAt: string;
  stage: "brief draft";
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

function isSuccessfulDraft(prediction: BriefDraftShadowTrialPrediction) {
  return (
    prediction.sourceFidelityScore >= 0.85 &&
    prediction.summaryQualityScore >= 0.85 &&
    !prediction.sourceOmission &&
    !prediction.policyOverclaim &&
    !prediction.criticFailed
  );
}

function hasException(prediction: BriefDraftShadowTrialPrediction) {
  return (
    prediction.confidence < 0.85 ||
    prediction.sourceOmission ||
    prediction.policyOverclaim ||
    prediction.criticFailed
  );
}

function buildMetrics(
  fixtures: BriefDraftShadowTrialFixture[],
  pick: (fixture: BriefDraftShadowTrialFixture) => BriefDraftShadowTrialPrediction
): TrialMetrics {
  const successes = fixtures.filter((fixture) => isSuccessfulDraft(pick(fixture))).length;
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
  if (sampleCount < BRIEF_DRAFT_SHADOW_MINIMUM_SAMPLE_COUNT) {
    return {
      result: "need more samples" as const,
      notes: ["The stage has not yet reached the 20-item promote gate."],
      nextAction: "Add more adjudicated brief draft samples and rerun the trial."
    };
  }

  if (
    candidate.taskSuccessRate >= active.taskSuccessRate &&
    candidate.exceptionQueueInflow <= active.exceptionQueueInflow
  ) {
    return {
      result: "promote candidate" as const,
      notes: [
        "Candidate improved brief source fidelity and summary quality without increasing exceptions.",
        "The 20-item gate is satisfied for the brief-draft stage."
      ],
      nextAction: "Record the promote decision and open the discover-draft shadow trial."
    };
  }

  return {
    result: "keep active" as const,
    notes: ["Candidate did not clear the brief-draft promote gate against the active baseline."],
    nextAction: "Collect more samples and review source omission failures before another promote check."
  };
}

export function runBriefDraftShadowTrial(
  fixtures: BriefDraftShadowTrialFixture[] = briefDraftShadowTrialFixtures,
  performedAt = "2026-03-22T09:00:00.000Z"
): BriefDraftShadowTrialReport {
  const active = buildMetrics(fixtures, (fixture) => fixture.activePrediction);
  const candidate = buildMetrics(fixtures, (fixture) => fixture.candidatePrediction);

  return {
    performedAt,
    stage: "brief draft",
    mode: "hybrid",
    activeProvider: "ollama",
    activeModel: "gemma4:26b-a4b-it-q4_K_M",
    candidateProvider: "anthropic",
    candidateModel: "claude-sonnet-4-6",
    sampleCount: fixtures.length,
    minimumSampleCount: BRIEF_DRAFT_SHADOW_MINIMUM_SAMPLE_COUNT,
    remainingSamples: Math.max(0, BRIEF_DRAFT_SHADOW_MINIMUM_SAMPLE_COUNT - fixtures.length),
    sourceSet: Array.from(new Set(fixtures.map((fixture) => fixture.sourceName))),
    metrics: { active, candidate },
    outcome: determineOutcome(active, candidate, fixtures.length)
  };
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function renderBriefDraftShadowTrialLog(report: BriefDraftShadowTrialReport) {
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
    "- target surface: `brief`, `both`",
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
