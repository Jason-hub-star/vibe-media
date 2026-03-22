export type DiscoverDraftTrialProvider = "anthropic" | "ollama";
export type DiscoverDraftTrialModelId = "claude-sonnet-4-6" | "mistral-small3.1";

export interface DiscoverDraftShadowTrialExpected {
  categoryScoreTarget: number;
  actionLinkQualityTarget: number;
  ctaClarityTarget: number;
  summaryLengthTarget: number;
  confidence: number;
  rationale: string;
}

export interface DiscoverDraftShadowTrialPrediction {
  provider: DiscoverDraftTrialProvider;
  modelId: DiscoverDraftTrialModelId;
  categoryScore: number;
  actionLinkQualityScore: number;
  ctaClarityScore: number;
  summaryLength: number;
  confidence: number;
  latencyMs: number;
  remoteDelegationTriggered: boolean;
  searchTriggered: boolean;
  memoryFalsePositive: boolean;
  brokenActionLink: boolean;
  genericSummary: boolean;
  irrelevantCta: boolean;
}

export interface DiscoverDraftShadowTrialFixture {
  id: string;
  sourceName: string;
  title: string;
  classificationTarget: "discover" | "both";
  expected: DiscoverDraftShadowTrialExpected;
  activePrediction: DiscoverDraftShadowTrialPrediction;
  candidatePrediction: DiscoverDraftShadowTrialPrediction;
}

const LOCAL_PROVIDER: DiscoverDraftTrialProvider = "ollama";
const LOCAL_MODEL_ID: DiscoverDraftTrialModelId = "mistral-small3.1";
const CANDIDATE_PROVIDER: DiscoverDraftTrialProvider = "anthropic";
const CANDIDATE_MODEL_ID: DiscoverDraftTrialModelId = "claude-sonnet-4-6";

function createPrediction(
  provider: DiscoverDraftTrialProvider,
  modelId: DiscoverDraftTrialModelId,
  expected: DiscoverDraftShadowTrialExpected,
  overrides: Partial<Omit<DiscoverDraftShadowTrialPrediction, "provider" | "modelId">> = {}
): DiscoverDraftShadowTrialPrediction {
  return {
    provider,
    modelId,
    categoryScore: expected.categoryScoreTarget,
    actionLinkQualityScore: expected.actionLinkQualityTarget,
    ctaClarityScore: expected.ctaClarityTarget,
    summaryLength: expected.summaryLengthTarget,
    confidence: expected.confidence,
    latencyMs: provider === "ollama" ? 210 : 440,
    remoteDelegationTriggered: false,
    searchTriggered: false,
    memoryFalsePositive: false,
    brokenActionLink: false,
    genericSummary: false,
    irrelevantCta: false,
    ...overrides
  };
}

function createFixture(
  fixture: Omit<DiscoverDraftShadowTrialFixture, "activePrediction" | "candidatePrediction"> & {
    activePrediction?: Partial<Omit<DiscoverDraftShadowTrialPrediction, "provider" | "modelId">>;
    candidatePrediction?: Partial<Omit<DiscoverDraftShadowTrialPrediction, "provider" | "modelId">>;
  }
): DiscoverDraftShadowTrialFixture {
  return {
    id: fixture.id,
    sourceName: fixture.sourceName,
    title: fixture.title,
    classificationTarget: fixture.classificationTarget,
    expected: fixture.expected,
    activePrediction: createPrediction(LOCAL_PROVIDER, LOCAL_MODEL_ID, fixture.expected, fixture.activePrediction),
    candidatePrediction: createPrediction(
      CANDIDATE_PROVIDER,
      CANDIDATE_MODEL_ID,
      fixture.expected,
      fixture.candidatePrediction
    )
  };
}

export const discoverDraftShadowTrialFixtures: DiscoverDraftShadowTrialFixture[] = [
  createFixture({ id: "discover-github-release-one", sourceName: "GitHub Releases", title: "Agent SDK release with CLI hooks", classificationTarget: "discover", expected: { categoryScoreTarget: 0.93, actionLinkQualityTarget: 0.91, ctaClarityTarget: 0.9, summaryLengthTarget: 130, confidence: 0.9, rationale: "Release CTA should point straight to release notes and repo." }, activePrediction: { categoryScore: 0.84, actionLinkQualityScore: 0.8, ctaClarityScore: 0.8, summaryLength: 172, confidence: 0.82, brokenActionLink: true }, candidatePrediction: { categoryScore: 0.94, actionLinkQualityScore: 0.92, ctaClarityScore: 0.91, summaryLength: 132, confidence: 0.91 } }),
  createFixture({ id: "discover-github-trending-one", sourceName: "GitHub Trending", title: "Fast-growing OSS workflow repo", classificationTarget: "discover", expected: { categoryScoreTarget: 0.91, actionLinkQualityTarget: 0.89, ctaClarityTarget: 0.88, summaryLengthTarget: 122, confidence: 0.88, rationale: "Trending CTA should tell the user why to watch or try." }, activePrediction: { categoryScore: 0.82, actionLinkQualityScore: 0.79, ctaClarityScore: 0.78, summaryLength: 170, confidence: 0.81, genericSummary: true }, candidatePrediction: { categoryScore: 0.92, actionLinkQualityScore: 0.9, ctaClarityScore: 0.89, summaryLength: 126, confidence: 0.89 } }),
  createFixture({ id: "discover-producthunt-one", sourceName: "Product Hunt AI", title: "New AI video helper launch", classificationTarget: "discover", expected: { categoryScoreTarget: 0.9, actionLinkQualityTarget: 0.88, ctaClarityTarget: 0.88, summaryLengthTarget: 118, confidence: 0.88, rationale: "Launch item needs direct product CTA and category fit." }, activePrediction: { categoryScore: 0.83, actionLinkQualityScore: 0.78, ctaClarityScore: 0.77, summaryLength: 166, confidence: 0.8, irrelevantCta: true }, candidatePrediction: { categoryScore: 0.91, actionLinkQualityScore: 0.89, ctaClarityScore: 0.89, summaryLength: 120, confidence: 0.89 } }),
  createFixture({ id: "discover-devpost-one", sourceName: "Devpost", title: "Hackathon program for multimodal builders", classificationTarget: "discover", expected: { categoryScoreTarget: 0.92, actionLinkQualityTarget: 0.9, ctaClarityTarget: 0.9, summaryLengthTarget: 124, confidence: 0.9, rationale: "Event item must call out apply deadline and scope." }, activePrediction: { categoryScore: 0.85, actionLinkQualityScore: 0.81, ctaClarityScore: 0.8, summaryLength: 175, confidence: 0.82, genericSummary: true }, candidatePrediction: { categoryScore: 0.92, actionLinkQualityScore: 0.91, ctaClarityScore: 0.91, summaryLength: 125, confidence: 0.9 } }),
  createFixture({ id: "discover-kaggle-one", sourceName: "Kaggle Competitions", title: "Kaggle evaluation challenge for agents", classificationTarget: "discover", expected: { categoryScoreTarget: 0.92, actionLinkQualityTarget: 0.9, ctaClarityTarget: 0.89, summaryLengthTarget: 126, confidence: 0.89, rationale: "Competition CTA should point to rules and participation." }, activePrediction: { categoryScore: 0.84, actionLinkQualityScore: 0.8, ctaClarityScore: 0.8, summaryLength: 173, confidence: 0.82, brokenActionLink: true }, candidatePrediction: { categoryScore: 0.93, actionLinkQualityScore: 0.9, ctaClarityScore: 0.9, summaryLength: 129, confidence: 0.9 } }),
  createFixture({ id: "discover-worldsfair-one", sourceName: "AI Engineer World's Fair", title: "Builder track call for talks", classificationTarget: "discover", expected: { categoryScoreTarget: 0.91, actionLinkQualityTarget: 0.9, ctaClarityTarget: 0.89, summaryLengthTarget: 128, confidence: 0.89, rationale: "CTA should explain whether to attend, submit, or watch." }, activePrediction: { categoryScore: 0.83, actionLinkQualityScore: 0.79, ctaClarityScore: 0.78, summaryLength: 169, confidence: 0.81, irrelevantCta: true }, candidatePrediction: { categoryScore: 0.92, actionLinkQualityScore: 0.91, ctaClarityScore: 0.9, summaryLength: 130, confidence: 0.9 } }),
  createFixture({ id: "discover-mlh-one", sourceName: "MLH", title: "Student AI hackathon intake", classificationTarget: "discover", expected: { categoryScoreTarget: 0.9, actionLinkQualityTarget: 0.88, ctaClarityTarget: 0.88, summaryLengthTarget: 120, confidence: 0.88, rationale: "Program CTA should be concrete and time-aware." }, activePrediction: { categoryScore: 0.82, actionLinkQualityScore: 0.78, ctaClarityScore: 0.78, summaryLength: 165, confidence: 0.8, genericSummary: true }, candidatePrediction: { categoryScore: 0.91, actionLinkQualityScore: 0.89, ctaClarityScore: 0.89, summaryLength: 121, confidence: 0.89 } }),
  createFixture({ id: "discover-github-release-two", sourceName: "GitHub Releases", title: "Open-source eval toolkit patch", classificationTarget: "both", expected: { categoryScoreTarget: 0.92, actionLinkQualityTarget: 0.91, ctaClarityTarget: 0.9, summaryLengthTarget: 128, confidence: 0.9, rationale: "Both-surface item still needs a clear discover CTA." }, activePrediction: { categoryScore: 0.85, actionLinkQualityScore: 0.81, ctaClarityScore: 0.8, summaryLength: 172, confidence: 0.82, brokenActionLink: true }, candidatePrediction: { categoryScore: 0.93, actionLinkQualityScore: 0.92, ctaClarityScore: 0.91, summaryLength: 130, confidence: 0.91 } }),
  createFixture({ id: "discover-github-trending-two", sourceName: "GitHub Trending", title: "Trending open agent memory repo", classificationTarget: "discover", expected: { categoryScoreTarget: 0.91, actionLinkQualityTarget: 0.89, ctaClarityTarget: 0.88, summaryLengthTarget: 124, confidence: 0.88, rationale: "Needs concise summary plus repo-follow CTA." }, activePrediction: { categoryScore: 0.83, actionLinkQualityScore: 0.79, ctaClarityScore: 0.78, summaryLength: 168, confidence: 0.81, genericSummary: true }, candidatePrediction: { categoryScore: 0.92, actionLinkQualityScore: 0.9, ctaClarityScore: 0.89, summaryLength: 124, confidence: 0.89 } }),
  createFixture({ id: "discover-producthunt-two", sourceName: "Product Hunt AI", title: "Creator tool with AI caption flow", classificationTarget: "discover", expected: { categoryScoreTarget: 0.9, actionLinkQualityTarget: 0.88, ctaClarityTarget: 0.88, summaryLengthTarget: 118, confidence: 0.88, rationale: "Launch CTA should say try, compare, or watch." }, activePrediction: { categoryScore: 0.84, actionLinkQualityScore: 0.79, ctaClarityScore: 0.78, summaryLength: 167, confidence: 0.81, irrelevantCta: true }, candidatePrediction: { categoryScore: 0.91, actionLinkQualityScore: 0.89, ctaClarityScore: 0.89, summaryLength: 120, confidence: 0.89 } }),
  createFixture({ id: "discover-devpost-two", sourceName: "Devpost", title: "University agent builder challenge", classificationTarget: "discover", expected: { categoryScoreTarget: 0.91, actionLinkQualityTarget: 0.89, ctaClarityTarget: 0.89, summaryLengthTarget: 123, confidence: 0.89, rationale: "CTA should preserve submission path and timing." }, activePrediction: { categoryScore: 0.84, actionLinkQualityScore: 0.8, ctaClarityScore: 0.79, summaryLength: 171, confidence: 0.82, genericSummary: true }, candidatePrediction: { categoryScore: 0.92, actionLinkQualityScore: 0.9, ctaClarityScore: 0.9, summaryLength: 124, confidence: 0.9 } }),
  createFixture({ id: "discover-kaggle-two", sourceName: "Kaggle Competitions", title: "Inference optimization challenge", classificationTarget: "discover", expected: { categoryScoreTarget: 0.92, actionLinkQualityTarget: 0.9, ctaClarityTarget: 0.89, summaryLengthTarget: 127, confidence: 0.89, rationale: "Competition summary should be concrete, not generic." }, activePrediction: { categoryScore: 0.85, actionLinkQualityScore: 0.81, ctaClarityScore: 0.8, summaryLength: 174, confidence: 0.82, brokenActionLink: true }, candidatePrediction: { categoryScore: 0.93, actionLinkQualityScore: 0.91, ctaClarityScore: 0.9, summaryLength: 128, confidence: 0.9 } }),
  createFixture({ id: "discover-worldsfair-two", sourceName: "AI Engineer World's Fair", title: "Startup showcase applications", classificationTarget: "discover", expected: { categoryScoreTarget: 0.91, actionLinkQualityTarget: 0.9, ctaClarityTarget: 0.89, summaryLengthTarget: 129, confidence: 0.89, rationale: "Event CTA should say whether to apply or attend." }, activePrediction: { categoryScore: 0.83, actionLinkQualityScore: 0.79, ctaClarityScore: 0.79, summaryLength: 170, confidence: 0.81, irrelevantCta: true }, candidatePrediction: { categoryScore: 0.92, actionLinkQualityScore: 0.91, ctaClarityScore: 0.9, summaryLength: 130, confidence: 0.9 } }),
  createFixture({ id: "discover-mlh-two", sourceName: "MLH", title: "Weekend hackathon with AI track", classificationTarget: "discover", expected: { categoryScoreTarget: 0.9, actionLinkQualityTarget: 0.88, ctaClarityTarget: 0.88, summaryLengthTarget: 119, confidence: 0.88, rationale: "Should be easy to scan and action." }, activePrediction: { categoryScore: 0.82, actionLinkQualityScore: 0.78, ctaClarityScore: 0.78, summaryLength: 164, confidence: 0.8, genericSummary: true }, candidatePrediction: { categoryScore: 0.91, actionLinkQualityScore: 0.89, ctaClarityScore: 0.89, summaryLength: 120, confidence: 0.89 } }),
  createFixture({ id: "discover-release-mirror-one", sourceName: "GitHub Release Mirror", title: "Mirrored open-source agent runtime release", classificationTarget: "discover", expected: { categoryScoreTarget: 0.9, actionLinkQualityTarget: 0.88, ctaClarityTarget: 0.87, summaryLengthTarget: 126, confidence: 0.87, rationale: "Mirror item should still point to canonical repo action." }, activePrediction: { categoryScore: 0.83, actionLinkQualityScore: 0.79, ctaClarityScore: 0.78, summaryLength: 168, confidence: 0.8, brokenActionLink: true }, candidatePrediction: { categoryScore: 0.91, actionLinkQualityScore: 0.89, ctaClarityScore: 0.88, summaryLength: 127, confidence: 0.88 } }),
  createFixture({ id: "discover-trending-three", sourceName: "GitHub Trending", title: "Trending evaluation dashboard repo", classificationTarget: "both", expected: { categoryScoreTarget: 0.91, actionLinkQualityTarget: 0.89, ctaClarityTarget: 0.88, summaryLengthTarget: 123, confidence: 0.88, rationale: "Both-surface discover item should still have repo CTA clarity." }, activePrediction: { categoryScore: 0.84, actionLinkQualityScore: 0.79, ctaClarityScore: 0.79, summaryLength: 169, confidence: 0.81, genericSummary: true }, candidatePrediction: { categoryScore: 0.92, actionLinkQualityScore: 0.9, ctaClarityScore: 0.89, summaryLength: 124, confidence: 0.89 } }),
  createFixture({ id: "discover-producthunt-three", sourceName: "Product Hunt AI", title: "Workflow co-pilot launch", classificationTarget: "discover", expected: { categoryScoreTarget: 0.9, actionLinkQualityTarget: 0.88, ctaClarityTarget: 0.88, summaryLengthTarget: 117, confidence: 0.88, rationale: "CTA should state why the launch matters to operators." }, activePrediction: { categoryScore: 0.83, actionLinkQualityScore: 0.78, ctaClarityScore: 0.78, summaryLength: 166, confidence: 0.8, irrelevantCta: true }, candidatePrediction: { categoryScore: 0.91, actionLinkQualityScore: 0.89, ctaClarityScore: 0.89, summaryLength: 118, confidence: 0.89 } }),
  createFixture({ id: "discover-devpost-three", sourceName: "Devpost", title: "AI infra builder sprint", classificationTarget: "discover", expected: { categoryScoreTarget: 0.91, actionLinkQualityTarget: 0.89, ctaClarityTarget: 0.89, summaryLengthTarget: 122, confidence: 0.89, rationale: "CTA should emphasize submission route and deadline." }, activePrediction: { categoryScore: 0.84, actionLinkQualityScore: 0.8, ctaClarityScore: 0.79, summaryLength: 170, confidence: 0.82, genericSummary: true }, candidatePrediction: { categoryScore: 0.92, actionLinkQualityScore: 0.9, ctaClarityScore: 0.9, summaryLength: 123, confidence: 0.9 } }),
  createFixture({ id: "discover-kaggle-three", sourceName: "Kaggle Competitions", title: "Leaderboard challenge for multimodal scoring", classificationTarget: "discover", expected: { categoryScoreTarget: 0.92, actionLinkQualityTarget: 0.9, ctaClarityTarget: 0.89, summaryLengthTarget: 128, confidence: 0.89, rationale: "Challenge item should stay concrete and actionable." }, activePrediction: { categoryScore: 0.85, actionLinkQualityScore: 0.81, ctaClarityScore: 0.8, summaryLength: 175, confidence: 0.82, brokenActionLink: true }, candidatePrediction: { categoryScore: 0.93, actionLinkQualityScore: 0.91, ctaClarityScore: 0.9, summaryLength: 128, confidence: 0.9 } }),
  createFixture({ id: "discover-release-three", sourceName: "GitHub Releases", title: "Open tooling update for data connectors", classificationTarget: "discover", expected: { categoryScoreTarget: 0.92, actionLinkQualityTarget: 0.91, ctaClarityTarget: 0.9, summaryLengthTarget: 129, confidence: 0.9, rationale: "Release item should keep the link action specific." }, activePrediction: { categoryScore: 0.84, actionLinkQualityScore: 0.8, ctaClarityScore: 0.8, summaryLength: 173, confidence: 0.82, brokenActionLink: true }, candidatePrediction: { categoryScore: 0.93, actionLinkQualityScore: 0.92, ctaClarityScore: 0.91, summaryLength: 130, confidence: 0.91 } })
];
