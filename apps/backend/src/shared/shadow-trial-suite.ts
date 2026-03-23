import { runBriefDraftShadowTrial, type BriefDraftShadowTrialReport } from "./brief-draft-shadow-trial";
import { runClassifierShadowTrial, type ClassifierShadowTrialReport } from "./classifier-shadow-trial";
import { runCriticShadowTrial, type CriticShadowTrialReport } from "./critic-shadow-trial";
import { runDiscoverDraftShadowTrial, type DiscoverDraftShadowTrialReport } from "./discover-draft-shadow-trial";

type TrialResult = "promote candidate" | "keep active" | "need more samples" | "rollback";

export interface ShadowTrialStageSummary {
  stage: string;
  result: TrialResult;
  nextAction: string;
}

export interface ShadowTrialSuiteReport {
  performedAt: string;
  overallStatus: "baseline-pass" | "baseline-warning" | "rollback-risk";
  exitCode: 0 | 1 | 2;
  notes: string[];
  stages: ShadowTrialStageSummary[];
  reports: {
    classifier: ClassifierShadowTrialReport;
    briefDraft: BriefDraftShadowTrialReport;
    discoverDraft: DiscoverDraftShadowTrialReport;
    critic: CriticShadowTrialReport;
  };
}

function toStageSummary(stage: string, result: TrialResult, nextAction: string): ShadowTrialStageSummary {
  return { stage, result, nextAction };
}

function summarizeOverallStatus(results: TrialResult[]) {
  if (results.includes("rollback")) {
    return {
      overallStatus: "rollback-risk" as const,
      exitCode: 2 as const,
      notes: ["At least one stage signaled rollback risk inside the fixture-backed suite."]
    };
  }

  if (results.every((result) => result === "promote candidate")) {
    return {
      overallStatus: "baseline-pass" as const,
      exitCode: 0 as const,
      notes: [
        "All stage-level shadow trials are currently in promote-candidate state.",
        "This suite is fixture-backed baseline validation, not a live runtime drift signal."
      ]
    };
  }

  return {
    overallStatus: "baseline-warning" as const,
    exitCode: 1 as const,
    notes: [
      "One or more stage-level shadow trials still need samples or remain on keep-active.",
      "This suite is fixture-backed baseline validation, not a live runtime drift signal."
    ]
  };
}

export function runAllShadowTrials(performedAt = new Date().toISOString()): ShadowTrialSuiteReport {
  const classifier = runClassifierShadowTrial(undefined, performedAt);
  const briefDraft = runBriefDraftShadowTrial(undefined, performedAt);
  const discoverDraft = runDiscoverDraftShadowTrial(undefined, performedAt);
  const critic = runCriticShadowTrial(undefined, performedAt);
  const stageResults = [
    classifier.outcome.result,
    briefDraft.outcome.result,
    discoverDraft.outcome.result,
    critic.outcome.result
  ];
  const overall = summarizeOverallStatus(stageResults);

  return {
    performedAt,
    overallStatus: overall.overallStatus,
    exitCode: overall.exitCode,
    notes: overall.notes,
    stages: [
      toStageSummary(classifier.stage, classifier.outcome.result, classifier.outcome.nextAction),
      toStageSummary(briefDraft.stage, briefDraft.outcome.result, briefDraft.outcome.nextAction),
      toStageSummary(discoverDraft.stage, discoverDraft.outcome.result, discoverDraft.outcome.nextAction),
      toStageSummary(critic.stage, critic.outcome.result, critic.outcome.nextAction)
    ],
    reports: {
      classifier,
      briefDraft,
      discoverDraft,
      critic
    }
  };
}
