import type {
  ClassifierShadowTrialExpected,
  ClassifierShadowTrialFixture,
  ClassifierTrialModelId,
  ClassifierShadowTrialPrediction,
  ClassifierTrialCategory,
  ClassifierTrialProvider
} from "./classifier-shadow-trial-fixture-types";

export const LOCAL_CLASSIFIER_PROVIDER: ClassifierTrialProvider = "ollama";
export const LOCAL_CLASSIFIER_MODEL_ID: ClassifierTrialModelId = "mistral-small3.1";
export const CANDIDATE_CLASSIFIER_PROVIDER: ClassifierTrialProvider = "anthropic";
export const CANDIDATE_CLASSIFIER_MODEL_ID: ClassifierTrialModelId = "claude-sonnet-4-6";

interface PredictionOverrides {
  targetSurface?: ClassifierShadowTrialPrediction["targetSurface"];
  category?: ClassifierTrialCategory;
  confidence?: number;
  latencyMs?: number;
  remoteDelegationTriggered?: boolean;
  searchTriggered?: boolean;
  memoryFalsePositive?: boolean;
}

export interface ClassifierShadowTrialFixtureDraft {
  id: string;
  sourceName: string;
  sourceTier: ClassifierShadowTrialFixture["sourceTier"];
  title: string;
  parsedSummary: string;
  tags: string[];
  dedupeKey: string;
  expected: ClassifierShadowTrialExpected;
  activePrediction?: PredictionOverrides;
  candidatePrediction?: PredictionOverrides;
}

function createPrediction(
  provider: ClassifierTrialProvider,
  modelId: ClassifierTrialModelId,
  expected: ClassifierShadowTrialExpected,
  overrides: PredictionOverrides = {}
): ClassifierShadowTrialPrediction {
  return {
    provider,
    modelId,
    targetSurface: expected.targetSurface,
    category: expected.category,
    confidence: expected.adjudicatedConfidence,
    latencyMs: provider === "ollama" ? 165 : 360,
    remoteDelegationTriggered: false,
    searchTriggered: false,
    memoryFalsePositive: false,
    ...overrides
  };
}

export function createClassifierShadowTrialFixture(
  draft: ClassifierShadowTrialFixtureDraft
): ClassifierShadowTrialFixture {
  return {
    id: draft.id,
    sourceName: draft.sourceName,
    sourceTier: draft.sourceTier,
    title: draft.title,
    parsedSummary: draft.parsedSummary,
    tags: draft.tags,
    dedupeKey: draft.dedupeKey,
    expected: draft.expected,
    activePrediction: createPrediction(
      LOCAL_CLASSIFIER_PROVIDER,
      LOCAL_CLASSIFIER_MODEL_ID,
      draft.expected,
      draft.activePrediction
    ),
    candidatePrediction: createPrediction(
      CANDIDATE_CLASSIFIER_PROVIDER,
      CANDIDATE_CLASSIFIER_MODEL_ID,
      draft.expected,
      draft.candidatePrediction
    )
  };
}
