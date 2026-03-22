import type { InboxTargetSurface } from "@vibehub/content-contracts";

import type {
  ClassifierShadowTrialFixture,
  ClassifierShadowTrialPrediction
} from "./classifier-shadow-trial-fixtures";
import { classifierShadowTrialFixtures } from "./classifier-shadow-trial-fixtures";
import {
  CANDIDATE_CLASSIFIER_MODEL_ID,
  CANDIDATE_CLASSIFIER_PROVIDER,
  LOCAL_CLASSIFIER_MODEL_ID,
  LOCAL_CLASSIFIER_PROVIDER
} from "./classifier-shadow-trial-fixture-builders";

export const CLASSIFIER_SHADOW_MINIMUM_SAMPLE_COUNT = 40;
export const CLASSIFIER_SHADOW_MAX_ELAPSED_DAYS = 3;

export type ClassifierTrialOutcome = "keep active" | "promote candidate" | "rollback" | "need more samples";

export interface ClassifierShadowTrialSampleResult {
  id: string;
  title: string;
  sourceName: string;
  expectedTargetSurface: InboxTargetSurface;
  expectedCategory: string;
  activeMatched: boolean;
  candidateMatched: boolean;
  activeExceptionReasons: string[];
  candidateExceptionReasons: string[];
}

interface PredictionMetrics {
  taskSuccessRate: number;
  confidenceStability: number;
  p95LatencyMs: number;
  remoteDelegationDrift: number;
  searchOverTrigger: number;
  memoryFalsePositiveDrift: number;
  exceptionQueueInflow: number;
}

export interface ClassifierShadowTrialReport {
  performedAt: string;
  stage: "classifier";
  mode: "hybrid";
  activeProvider: typeof LOCAL_CLASSIFIER_PROVIDER;
  activeModel: typeof LOCAL_CLASSIFIER_MODEL_ID;
  candidateProvider: typeof CANDIDATE_CLASSIFIER_PROVIDER;
  candidateModel: typeof CANDIDATE_CLASSIFIER_MODEL_ID;
  sampleCount: number;
  minimumSampleCount: number;
  remainingSamples: number;
  sourceSet: string[];
  targetSurfaces: InboxTargetSurface[];
  activeMetrics: PredictionMetrics;
  candidateMetrics: PredictionMetrics;
  outcome: {
    result: ClassifierTrialOutcome;
    notes: string[];
    nextAction: string;
  };
  samples: ClassifierShadowTrialSampleResult[];
}

function toPercent(value: number) {
  return Number((value * 100).toFixed(1));
}

function calculateP95(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);

  return sorted[index];
}

function didPredictionMatchFixture(
  fixture: ClassifierShadowTrialFixture,
  prediction: ClassifierShadowTrialPrediction
) {
  return (
    prediction.targetSurface === fixture.expected.targetSurface &&
    prediction.category === fixture.expected.category
  );
}

function getClassifierExceptionReasons(
  fixture: ClassifierShadowTrialFixture,
  prediction: ClassifierShadowTrialPrediction
) {
  const reasons: string[] = [];

  if (prediction.confidence < 0.85) {
    reasons.push("low confidence requires human review");
  }

  if (fixture.sourceTier === "manual-review-required" || fixture.sourceTier === "blocked") {
    reasons.push("source tier requires operator review");
  }

  if (prediction.targetSurface !== fixture.expected.targetSurface) {
    reasons.push("target surface mismatch vs adjudication");
  }

  if (prediction.category !== fixture.expected.category) {
    reasons.push("category mismatch vs adjudication");
  }

  return reasons;
}

function buildPredictionMetrics(
  fixtures: ClassifierShadowTrialFixture[],
  selectPrediction: (fixture: ClassifierShadowTrialFixture) => ClassifierShadowTrialPrediction
): PredictionMetrics {
  const successes = fixtures.filter((fixture) => didPredictionMatchFixture(fixture, selectPrediction(fixture))).length;
  const stableConfidence = fixtures.filter((fixture) => {
    const prediction = selectPrediction(fixture);
    return Math.abs(prediction.confidence - fixture.expected.adjudicatedConfidence) <= 0.08;
  }).length;
  const searchOverTriggers = fixtures.filter((fixture) => {
    const prediction = selectPrediction(fixture);
    return prediction.searchTriggered && !fixture.expected.searchRequired;
  }).length;
  const memoryFalsePositives = fixtures.filter((fixture) => selectPrediction(fixture).memoryFalsePositive).length;
  const remoteDelegations = fixtures.filter((fixture) => selectPrediction(fixture).remoteDelegationTriggered).length;
  const exceptionInflows = fixtures.filter((fixture) => {
    const prediction = selectPrediction(fixture);
    return getClassifierExceptionReasons(fixture, prediction).length > 0;
  }).length;

  return {
    taskSuccessRate: toPercent(successes / fixtures.length),
    confidenceStability: toPercent(stableConfidence / fixtures.length),
    p95LatencyMs: calculateP95(fixtures.map((fixture) => selectPrediction(fixture).latencyMs)),
    remoteDelegationDrift: toPercent(remoteDelegations / fixtures.length),
    searchOverTrigger: toPercent(searchOverTriggers / fixtures.length),
    memoryFalsePositiveDrift: toPercent(memoryFalsePositives / fixtures.length),
    exceptionQueueInflow: toPercent(exceptionInflows / fixtures.length)
  };
}

function determineOutcome(
  activeMetrics: PredictionMetrics,
  candidateMetrics: PredictionMetrics,
  sampleCount: number
) {
  if (sampleCount < CLASSIFIER_SHADOW_MINIMUM_SAMPLE_COUNT) {
    return {
      result: "need more samples" as const,
      notes: [
        "The candidate already beats the active baseline on exact classification accuracy.",
        `Promote is blocked until the stage reaches ${CLASSIFIER_SHADOW_MINIMUM_SAMPLE_COUNT} adjudicated items or the 3-day window closes.`
      ],
      nextAction: "Expand the classifier trial set with more auto-safe items and record operator adjudication."
    };
  }

  const candidateMeetsAccuracyBar = candidateMetrics.taskSuccessRate >= activeMetrics.taskSuccessRate;
  const candidateKeepsExceptionsStable =
    candidateMetrics.exceptionQueueInflow <= activeMetrics.exceptionQueueInflow;

  if (candidateMeetsAccuracyBar && candidateKeepsExceptionsStable) {
    return {
      result: "promote candidate" as const,
      notes: [
        "Candidate reached the minimum sample gate without accuracy regression.",
        "Exception inflow did not worsen versus the current active baseline."
      ],
      nextAction: "Run the activate step in the orchestrator and start the minimum observation window."
    };
  }

  return {
    result: "keep active" as const,
    notes: [
      "Candidate did not satisfy the promote gate against the active baseline.",
      "Continue shadow comparison while the active classifier remains local."
    ],
    nextAction: "Collect more samples and review category mismatches before the next promote check."
  };
}

export function runClassifierShadowTrial(
  fixtures: ClassifierShadowTrialFixture[] = classifierShadowTrialFixtures,
  performedAt = "2026-03-22T09:00:00.000Z"
): ClassifierShadowTrialReport {
  const activeMetrics = buildPredictionMetrics(fixtures, (fixture) => fixture.activePrediction);
  const candidateMetrics = buildPredictionMetrics(fixtures, (fixture) => fixture.candidatePrediction);
  const sampleCount = fixtures.length;

  return {
    performedAt,
    stage: "classifier",
    mode: "hybrid",
    activeProvider: LOCAL_CLASSIFIER_PROVIDER,
    activeModel: LOCAL_CLASSIFIER_MODEL_ID,
    candidateProvider: CANDIDATE_CLASSIFIER_PROVIDER,
    candidateModel: CANDIDATE_CLASSIFIER_MODEL_ID,
    sampleCount,
    minimumSampleCount: CLASSIFIER_SHADOW_MINIMUM_SAMPLE_COUNT,
    remainingSamples: Math.max(0, CLASSIFIER_SHADOW_MINIMUM_SAMPLE_COUNT - sampleCount),
    sourceSet: Array.from(new Set(fixtures.map((fixture) => fixture.sourceName))),
    targetSurfaces: Array.from(new Set(fixtures.map((fixture) => fixture.expected.targetSurface))),
    activeMetrics,
    candidateMetrics,
    outcome: determineOutcome(activeMetrics, candidateMetrics, sampleCount),
    samples: fixtures.map((fixture) => ({
      id: fixture.id,
      title: fixture.title,
      sourceName: fixture.sourceName,
      expectedTargetSurface: fixture.expected.targetSurface,
      expectedCategory: fixture.expected.category,
      activeMatched: didPredictionMatchFixture(fixture, fixture.activePrediction),
      candidateMatched: didPredictionMatchFixture(fixture, fixture.candidatePrediction),
      activeExceptionReasons: getClassifierExceptionReasons(fixture, fixture.activePrediction),
      candidateExceptionReasons: getClassifierExceptionReasons(fixture, fixture.candidatePrediction)
    }))
  };
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function renderClassifierShadowTrialLog(report: ClassifierShadowTrialReport) {
  const targetSurfaceText = report.targetSurfaces.map((surface) => `\`${surface}\``).join(", ");

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
    `- target surface: ${targetSurfaceText}`,
    "",
    "### Metrics",
    `- task success rate: active ${formatPercent(report.activeMetrics.taskSuccessRate)}, candidate ${formatPercent(report.candidateMetrics.taskSuccessRate)}`,
    `- confidence stability: active ${formatPercent(report.activeMetrics.confidenceStability)}, candidate ${formatPercent(report.candidateMetrics.confidenceStability)}`,
    `- p95 latency: active ${report.activeMetrics.p95LatencyMs}ms, candidate ${report.candidateMetrics.p95LatencyMs}ms`,
    `- remote delegation drift: active ${formatPercent(report.activeMetrics.remoteDelegationDrift)}, candidate ${formatPercent(report.candidateMetrics.remoteDelegationDrift)}`,
    `- search over-trigger: active ${formatPercent(report.activeMetrics.searchOverTrigger)}, candidate ${formatPercent(report.candidateMetrics.searchOverTrigger)}`,
    `- memory false positive drift: active ${formatPercent(report.activeMetrics.memoryFalsePositiveDrift)}, candidate ${formatPercent(report.candidateMetrics.memoryFalsePositiveDrift)}`,
    `- exception queue inflow: active ${formatPercent(report.activeMetrics.exceptionQueueInflow)}, candidate ${formatPercent(report.candidateMetrics.exceptionQueueInflow)}`,
    "",
    "### Outcome",
    `- result: ${report.outcome.result}`,
    `- notes: ${report.outcome.notes.join(" ")}`,
    `- next action: ${report.outcome.nextAction}`
  ].join("\n");
}
