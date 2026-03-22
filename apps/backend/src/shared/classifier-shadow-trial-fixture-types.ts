import type { InboxTargetSurface } from "@vibehub/content-contracts";

export type ClassifierTrialProvider = "anthropic" | "ollama";
export type ClassifierTrialModelId = "claude-opus-4-6" | "claude-sonnet-4-6" | "mistral-small3.1";

export type ClassifierTrialCategory =
  | "api"
  | "contest"
  | "duplicate"
  | "event"
  | "open_source"
  | "reference"
  | "research"
  | "sdk"
  | "website";

export interface ClassifierShadowTrialExpected {
  targetSurface: InboxTargetSurface;
  category: ClassifierTrialCategory;
  adjudicatedConfidence: number;
  rationale: string;
  searchRequired: boolean;
}

export interface ClassifierShadowTrialPrediction {
  provider: ClassifierTrialProvider;
  modelId: ClassifierTrialModelId;
  targetSurface: InboxTargetSurface;
  category: ClassifierTrialCategory;
  confidence: number;
  latencyMs: number;
  remoteDelegationTriggered: boolean;
  searchTriggered: boolean;
  memoryFalsePositive: boolean;
}

export interface ClassifierShadowTrialFixture {
  id: string;
  sourceName: string;
  sourceTier: "auto-safe" | "render-required" | "manual-review-required" | "blocked";
  title: string;
  parsedSummary: string;
  tags: string[];
  dedupeKey: string;
  expected: ClassifierShadowTrialExpected;
  activePrediction: ClassifierShadowTrialPrediction;
  candidatePrediction: ClassifierShadowTrialPrediction;
}
