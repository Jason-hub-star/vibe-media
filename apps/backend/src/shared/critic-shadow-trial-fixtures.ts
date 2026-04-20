export type CriticTrialProvider = "anthropic" | "ollama";
export type CriticTrialModelId = "claude-sonnet-4-6" | "gemma4:26b-a4b-it-q4_K_M";

export interface CriticShadowTrialExpected {
  shouldBlock: boolean;
  riskTag: "broken link" | "generic summary" | "irrelevant CTA" | "policy overclaim" | "safe" | "source omission";
  confidence: number;
  rationale: string;
}

export interface CriticShadowTrialPrediction {
  provider: CriticTrialProvider;
  modelId: CriticTrialModelId;
  decision: "block" | "pass";
  confidence: number;
  latencyMs: number;
  remoteDelegationTriggered: boolean;
  searchTriggered: boolean;
  memoryFalsePositive: boolean;
  falsePositiveFlag: boolean;
  missedPolicyRisk: boolean;
}

export interface CriticShadowTrialFixture {
  id: string;
  sourceName: string;
  title: string;
  targetSurface: "brief" | "discover" | "both";
  expected: CriticShadowTrialExpected;
  activePrediction: CriticShadowTrialPrediction;
  candidatePrediction: CriticShadowTrialPrediction;
}

const LOCAL_PROVIDER: CriticTrialProvider = "ollama";
const LOCAL_MODEL_ID: CriticTrialModelId = "gemma4:26b-a4b-it-q4_K_M";
const CANDIDATE_PROVIDER: CriticTrialProvider = "anthropic";
const CANDIDATE_MODEL_ID: CriticTrialModelId = "claude-sonnet-4-6";

const activeMissedPolicyIds = new Set([
  "critic-brief-openai-1",
  "critic-brief-anthropic-1",
  "critic-discover-ghrelease-1",
  "critic-discover-devpost-1",
  "critic-discover-kaggle-1"
]);

const activeFalsePositiveIds = new Set([
  "critic-brief-google-1",
  "critic-brief-hf-1",
  "critic-discover-ph-1",
  "critic-discover-mlh-1"
]);

const candidateMissedPolicyIds = new Set(["critic-discover-ghrelease-2"]);
const candidateLowConfidenceIds = new Set(["critic-brief-transcript-1"]);

function createPrediction(
  provider: CriticTrialProvider,
  modelId: CriticTrialModelId,
  expected: CriticShadowTrialExpected,
  overrides: Partial<Omit<CriticShadowTrialPrediction, "provider" | "modelId">> = {}
): CriticShadowTrialPrediction {
  return {
    provider,
    modelId,
    decision: expected.shouldBlock ? "block" : "pass",
    confidence: expected.confidence,
    latencyMs: provider === "ollama" ? 205 : 435,
    remoteDelegationTriggered: false,
    searchTriggered: false,
    memoryFalsePositive: false,
    falsePositiveFlag: false,
    missedPolicyRisk: false,
    ...overrides
  };
}

function createFixture(
  id: string,
  sourceName: string,
  title: string,
  targetSurface: "brief" | "discover" | "both",
  expected: CriticShadowTrialExpected
): CriticShadowTrialFixture {
  const activePrediction = createPrediction(LOCAL_PROVIDER, LOCAL_MODEL_ID, expected, {
    ...(activeMissedPolicyIds.has(id) ? { decision: "pass", confidence: 0.81, missedPolicyRisk: true } : {}),
    ...(activeFalsePositiveIds.has(id)
      ? { decision: "block", confidence: 0.82, falsePositiveFlag: true, memoryFalsePositive: true }
      : {})
  });

  const candidatePrediction = createPrediction(CANDIDATE_PROVIDER, CANDIDATE_MODEL_ID, expected, {
    ...(candidateMissedPolicyIds.has(id) ? { decision: "pass", confidence: 0.83, missedPolicyRisk: true } : {}),
    ...(candidateLowConfidenceIds.has(id) ? { confidence: 0.82 } : {})
  });

  return {
    id,
    sourceName,
    title,
    targetSurface,
    expected,
    activePrediction,
    candidatePrediction
  };
}

const fixtureRows: Array<
  [string, string, string, "brief" | "discover" | "both", CriticShadowTrialExpected["riskTag"], boolean, number, string]
> = [
  ["critic-brief-openai-1", "OpenAI News", "OpenAI brief with omitted rollout caveat", "brief", "source omission", true, 0.9, "Missing rollout caveat should block publication."],
  ["critic-brief-anthropic-1", "Anthropic Research", "Anthropic brief with overclaim wording", "brief", "policy overclaim", true, 0.9, "Research overclaim needs a block."],
  ["critic-discover-ghrelease-1", "GitHub Releases", "Discover card with broken release CTA", "discover", "broken link", true, 0.89, "Broken release link should block."],
  ["critic-discover-devpost-1", "Devpost", "Hackathon card with missing deadline caveat", "discover", "irrelevant CTA", true, 0.88, "CTA mismatch should block."],
  ["critic-discover-kaggle-1", "Kaggle Competitions", "Competition card with generic signup CTA", "discover", "generic summary", true, 0.88, "Generic CTA should block."],
  ["critic-brief-google-1", "Google AI Blog", "Clean workflow brief with accurate hedging", "brief", "safe", false, 0.88, "Accurate brief should pass."],
  ["critic-brief-hf-1", "Hugging Face Blog", "Safe builder tutorial summary", "brief", "safe", false, 0.87, "Tutorial summary should pass."],
  ["critic-discover-ph-1", "Product Hunt AI", "Launch card with valid CTA and title", "discover", "safe", false, 0.87, "Valid launch card should pass."],
  ["critic-discover-mlh-1", "MLH", "Student hackathon card with clear apply CTA", "discover", "safe", false, 0.87, "Clear CTA should pass."],
  ["critic-brief-transcript-1", "Transcript Mirror", "Transcript-backed brief with careful quotes", "brief", "safe", false, 0.86, "Careful transcript summary can pass with lower confidence."],
  ["critic-discover-ghrelease-2", "GitHub Releases", "Open-source release card with malformed CTA", "both", "broken link", true, 0.89, "Malformed CTA should block."],
  ["critic-brief-openai-2", "OpenAI API Changelog", "Migration brief with precise wording", "both", "safe", false, 0.89, "Migration brief should pass."],
  ["critic-brief-openai-3", "OpenAI News", "Safety note brief with accurate nuance", "brief", "safe", false, 0.88, "Safety brief can pass."],
  ["critic-brief-google-2", "Google DeepMind", "Research brief with proper hedging", "brief", "safe", false, 0.88, "Research hedging is sufficient."],
  ["critic-brief-hf-2", "Hugging Face Blog", "Open model recap with balanced claims", "brief", "safe", false, 0.87, "Balanced recap should pass."],
  ["critic-discover-ghtrend-1", "GitHub Trending", "Trending repo card with direct repo CTA", "discover", "safe", false, 0.87, "Direct repo CTA should pass."],
  ["critic-discover-ph-2", "Product Hunt AI", "Launch card with strong why-now CTA", "discover", "safe", false, 0.87, "Useful launch CTA should pass."],
  ["critic-discover-devpost-2", "Devpost", "Event card with clear submit CTA", "discover", "safe", false, 0.88, "Clear submission CTA should pass."],
  ["critic-discover-kaggle-2", "Kaggle Competitions", "Challenge card with valid rules link", "discover", "safe", false, 0.88, "Valid challenge link should pass."],
  ["critic-discover-worldsfair-1", "AI Engineer World's Fair", "Event card with correct attend CTA", "discover", "safe", false, 0.88, "Attend CTA should pass."],
  ["critic-discover-mlh-2", "MLH", "Weekend hackathon card with accurate timeframe", "discover", "safe", false, 0.87, "Accurate timeframe should pass."],
  ["critic-brief-anthropic-2", "Anthropic Research", "Research brief with source-aligned caution", "brief", "safe", false, 0.88, "Source-aligned caution should pass."],
  ["critic-brief-google-3", "Google Developers AI Blog", "Gemini rollout brief with docs links", "both", "safe", false, 0.88, "Docs-linked brief should pass."],
  ["critic-discover-ghtrend-2", "GitHub Trending", "Infra repo card with clean CTA", "both", "safe", false, 0.87, "Clean repo CTA should pass."],
  ["critic-discover-release-mirror-1", "GitHub Release Mirror", "Mirror release card with canonical repo CTA", "discover", "safe", false, 0.87, "Canonical repo CTA should pass."]
];

export const criticShadowTrialFixtures: CriticShadowTrialFixture[] = fixtureRows.map(
  ([id, sourceName, title, targetSurface, riskTag, shouldBlock, confidence, rationale]) =>
    createFixture(id, sourceName, title, targetSurface, {
      shouldBlock,
      riskTag,
      confidence,
      rationale
    })
);
