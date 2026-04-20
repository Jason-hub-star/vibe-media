export type BriefDraftTrialProvider = "anthropic" | "ollama";
export type BriefDraftTrialModelId = "claude-sonnet-4-6" | "gemma4:26b-a4b-it-q4_K_M";

export interface BriefDraftShadowTrialExpected {
  sourceFidelityTarget: number;
  summaryQualityTarget: number;
  confidence: number;
  rationale: string;
}

export interface BriefDraftShadowTrialPrediction {
  provider: BriefDraftTrialProvider;
  modelId: BriefDraftTrialModelId;
  sourceFidelityScore: number;
  summaryQualityScore: number;
  confidence: number;
  latencyMs: number;
  remoteDelegationTriggered: boolean;
  searchTriggered: boolean;
  memoryFalsePositive: boolean;
  sourceOmission: boolean;
  policyOverclaim: boolean;
  criticFailed: boolean;
}

export interface BriefDraftShadowTrialFixture {
  id: string;
  sourceName: string;
  title: string;
  sourceCount: number;
  classificationTarget: "brief" | "both";
  expected: BriefDraftShadowTrialExpected;
  activePrediction: BriefDraftShadowTrialPrediction;
  candidatePrediction: BriefDraftShadowTrialPrediction;
}

const LOCAL_PROVIDER: BriefDraftTrialProvider = "ollama";
const LOCAL_MODEL_ID: BriefDraftTrialModelId = "gemma4:26b-a4b-it-q4_K_M";
const CANDIDATE_PROVIDER: BriefDraftTrialProvider = "anthropic";
const CANDIDATE_MODEL_ID: BriefDraftTrialModelId = "claude-sonnet-4-6";

function createPrediction(
  provider: BriefDraftTrialProvider,
  modelId: BriefDraftTrialModelId,
  expected: BriefDraftShadowTrialExpected,
  overrides: Partial<Omit<BriefDraftShadowTrialPrediction, "provider" | "modelId">> = {}
): BriefDraftShadowTrialPrediction {
  return {
    provider,
    modelId,
    sourceFidelityScore: expected.sourceFidelityTarget,
    summaryQualityScore: expected.summaryQualityTarget,
    confidence: expected.confidence,
    latencyMs: provider === "ollama" ? 190 : 430,
    remoteDelegationTriggered: false,
    searchTriggered: false,
    memoryFalsePositive: false,
    sourceOmission: false,
    policyOverclaim: false,
    criticFailed: false,
    ...overrides
  };
}

function createFixture(
  fixture: Omit<BriefDraftShadowTrialFixture, "activePrediction" | "candidatePrediction"> & {
    activePrediction?: Partial<Omit<BriefDraftShadowTrialPrediction, "provider" | "modelId">>;
    candidatePrediction?: Partial<Omit<BriefDraftShadowTrialPrediction, "provider" | "modelId">>;
  }
): BriefDraftShadowTrialFixture {
  return {
    id: fixture.id,
    sourceName: fixture.sourceName,
    title: fixture.title,
    sourceCount: fixture.sourceCount,
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

export const briefDraftShadowTrialFixtures: BriefDraftShadowTrialFixture[] = [
  createFixture({ id: "brief-openai-agents-sdk", sourceName: "OpenAI News", title: "OpenAI Agents SDK update", sourceCount: 3, classificationTarget: "both", expected: { sourceFidelityTarget: 0.92, summaryQualityTarget: 0.9, confidence: 0.9, rationale: "Needs both accurate source coverage and clean Korean summary." }, activePrediction: { sourceFidelityScore: 0.78, summaryQualityScore: 0.84, confidence: 0.82, sourceOmission: true, criticFailed: true }, candidatePrediction: { sourceFidelityScore: 0.93, summaryQualityScore: 0.92, confidence: 0.91 } }),
  createFixture({ id: "brief-openai-changelog", sourceName: "OpenAI API Changelog", title: "Platform rate control rollout", sourceCount: 3, classificationTarget: "both", expected: { sourceFidelityTarget: 0.9, summaryQualityTarget: 0.88, confidence: 0.89, rationale: "Migration details must stay intact." }, activePrediction: { sourceFidelityScore: 0.83, summaryQualityScore: 0.84, confidence: 0.84, criticFailed: true }, candidatePrediction: { sourceFidelityScore: 0.91, summaryQualityScore: 0.9, confidence: 0.9 } }),
  createFixture({ id: "brief-anthropic-research", sourceName: "Anthropic Research", title: "Anthropic evaluation practice note", sourceCount: 2, classificationTarget: "brief", expected: { sourceFidelityTarget: 0.91, summaryQualityTarget: 0.89, confidence: 0.9, rationale: "Research nuance matters more than speed." }, activePrediction: { sourceFidelityScore: 0.87, summaryQualityScore: 0.83, confidence: 0.84 }, candidatePrediction: { sourceFidelityScore: 0.92, summaryQualityScore: 0.9, confidence: 0.9 } }),
  createFixture({ id: "brief-google-ai-workflow", sourceName: "Google AI Blog", title: "Google AI workflow post for developer teams", sourceCount: 2, classificationTarget: "brief", expected: { sourceFidelityTarget: 0.88, summaryQualityTarget: 0.87, confidence: 0.88, rationale: "Brief should stay explanatory and non-hyped." }, activePrediction: { sourceFidelityScore: 0.86, summaryQualityScore: 0.84, confidence: 0.85 }, candidatePrediction: { sourceFidelityScore: 0.89, summaryQualityScore: 0.88, confidence: 0.88 } }),
  createFixture({ id: "brief-openai-safety", sourceName: "OpenAI News", title: "OpenAI safety rollout explainer", sourceCount: 2, classificationTarget: "brief", expected: { sourceFidelityTarget: 0.9, summaryQualityTarget: 0.88, confidence: 0.89, rationale: "Avoid overclaim and preserve policy caveats." }, activePrediction: { sourceFidelityScore: 0.82, summaryQualityScore: 0.83, confidence: 0.82, policyOverclaim: true, criticFailed: true }, candidatePrediction: { sourceFidelityScore: 0.9, summaryQualityScore: 0.89, confidence: 0.9 } }),
  createFixture({ id: "brief-google-benchmark", sourceName: "Google AI Blog", title: "Google benchmark note for agent evaluation", sourceCount: 2, classificationTarget: "brief", expected: { sourceFidelityTarget: 0.89, summaryQualityTarget: 0.88, confidence: 0.88, rationale: "Benchmark claims need conservative tone." }, activePrediction: { sourceFidelityScore: 0.85, summaryQualityScore: 0.84, confidence: 0.84 }, candidatePrediction: { sourceFidelityScore: 0.9, summaryQualityScore: 0.88, confidence: 0.89 } }),
  createFixture({ id: "brief-deepmind-eval", sourceName: "Google DeepMind", title: "DeepMind evaluation note for agent teams", sourceCount: 2, classificationTarget: "brief", expected: { sourceFidelityTarget: 0.9, summaryQualityTarget: 0.88, confidence: 0.88, rationale: "Research framing must stay precise." }, activePrediction: { sourceFidelityScore: 0.87, summaryQualityScore: 0.84, confidence: 0.85 }, candidatePrediction: { sourceFidelityScore: 0.9, summaryQualityScore: 0.89, confidence: 0.89 } }),
  createFixture({ id: "brief-hf-rag", sourceName: "Hugging Face Blog", title: "RAG tutorial note for builder teams", sourceCount: 2, classificationTarget: "brief", expected: { sourceFidelityTarget: 0.87, summaryQualityTarget: 0.87, confidence: 0.87, rationale: "Tutorial brief should stay practical." }, activePrediction: { sourceFidelityScore: 0.84, summaryQualityScore: 0.82, confidence: 0.83 }, candidatePrediction: { sourceFidelityScore: 0.88, summaryQualityScore: 0.88, confidence: 0.88 } }),
  createFixture({ id: "brief-anthropic-safety", sourceName: "Anthropic Research", title: "Anthropic safety interpretation note", sourceCount: 2, classificationTarget: "brief", expected: { sourceFidelityTarget: 0.9, summaryQualityTarget: 0.88, confidence: 0.89, rationale: "Preserve nuance and hedge uncertain claims." }, activePrediction: { sourceFidelityScore: 0.83, summaryQualityScore: 0.82, confidence: 0.82, policyOverclaim: true }, candidatePrediction: { sourceFidelityScore: 0.91, summaryQualityScore: 0.89, confidence: 0.89 } }),
  createFixture({ id: "brief-transcript-one", sourceName: "Transcript Mirror", title: "Karpathy on code agents and AutoResearch", sourceCount: 1, classificationTarget: "brief", expected: { sourceFidelityTarget: 0.86, summaryQualityTarget: 0.85, confidence: 0.82, rationale: "Manual-review source still needs careful quoting boundaries." }, activePrediction: { sourceFidelityScore: 0.78, summaryQualityScore: 0.81, confidence: 0.8, sourceOmission: true, criticFailed: true }, candidatePrediction: { sourceFidelityScore: 0.87, summaryQualityScore: 0.86, confidence: 0.84 } }),
  createFixture({ id: "brief-openai-migration", sourceName: "OpenAI API Changelog", title: "Migration guide for platform teams", sourceCount: 3, classificationTarget: "both", expected: { sourceFidelityTarget: 0.91, summaryQualityTarget: 0.89, confidence: 0.9, rationale: "Migration guide needs exact operational wording." }, activePrediction: { sourceFidelityScore: 0.84, summaryQualityScore: 0.85, confidence: 0.84, criticFailed: true }, candidatePrediction: { sourceFidelityScore: 0.92, summaryQualityScore: 0.9, confidence: 0.91 } }),
  createFixture({ id: "brief-anthropic-api-adjacent", sourceName: "Anthropic Research", title: "API-adjacent research update", sourceCount: 3, classificationTarget: "both", expected: { sourceFidelityTarget: 0.9, summaryQualityTarget: 0.88, confidence: 0.88, rationale: "Needs balanced research plus operational framing." }, activePrediction: { sourceFidelityScore: 0.8, summaryQualityScore: 0.83, confidence: 0.81, sourceOmission: true, policyOverclaim: true }, candidatePrediction: { sourceFidelityScore: 0.91, summaryQualityScore: 0.89, confidence: 0.89 } }),
  createFixture({ id: "brief-google-gemini-api", sourceName: "Google Developers AI Blog", title: "Gemini API rollout for developers", sourceCount: 3, classificationTarget: "both", expected: { sourceFidelityTarget: 0.9, summaryQualityTarget: 0.88, confidence: 0.89, rationale: "API rollout brief must keep docs linkage clear." }, activePrediction: { sourceFidelityScore: 0.83, summaryQualityScore: 0.84, confidence: 0.84 }, candidatePrediction: { sourceFidelityScore: 0.9, summaryQualityScore: 0.89, confidence: 0.9 } }),
  createFixture({ id: "brief-openai-responses-sdk", sourceName: "OpenAI News", title: "Responses SDK guide refresh", sourceCount: 3, classificationTarget: "both", expected: { sourceFidelityTarget: 0.91, summaryQualityTarget: 0.9, confidence: 0.9, rationale: "Guide refresh should read as a practical operator brief." }, activePrediction: { sourceFidelityScore: 0.8, summaryQualityScore: 0.84, confidence: 0.83, sourceOmission: true }, candidatePrediction: { sourceFidelityScore: 0.92, summaryQualityScore: 0.91, confidence: 0.91 } }),
  createFixture({ id: "brief-openai-api-controls", sourceName: "OpenAI API Changelog", title: "API control rollout for builders", sourceCount: 3, classificationTarget: "both", expected: { sourceFidelityTarget: 0.9, summaryQualityTarget: 0.88, confidence: 0.89, rationale: "Control-plane details must stay precise." }, activePrediction: { sourceFidelityScore: 0.84, summaryQualityScore: 0.84, confidence: 0.84 }, candidatePrediction: { sourceFidelityScore: 0.91, summaryQualityScore: 0.89, confidence: 0.89 } }),
  createFixture({ id: "brief-hf-open-model", sourceName: "Hugging Face Blog", title: "Open model release for workflow builders", sourceCount: 2, classificationTarget: "brief", expected: { sourceFidelityTarget: 0.87, summaryQualityTarget: 0.86, confidence: 0.87, rationale: "Release recap should avoid hype and keep source linkage." }, activePrediction: { sourceFidelityScore: 0.83, summaryQualityScore: 0.82, confidence: 0.82, policyOverclaim: true }, candidatePrediction: { sourceFidelityScore: 0.88, summaryQualityScore: 0.87, confidence: 0.88 } }),
  createFixture({ id: "brief-deepmind-memory", sourceName: "Google DeepMind", title: "DeepMind lab note on agent memory", sourceCount: 2, classificationTarget: "brief", expected: { sourceFidelityTarget: 0.89, summaryQualityTarget: 0.88, confidence: 0.89, rationale: "Memory-related claims need careful hedging." }, activePrediction: { sourceFidelityScore: 0.85, summaryQualityScore: 0.84, confidence: 0.84 }, candidatePrediction: { sourceFidelityScore: 0.9, summaryQualityScore: 0.89, confidence: 0.9 } }),
  createFixture({ id: "brief-google-workflow-second", sourceName: "Google AI Blog", title: "Workflow note for product teams", sourceCount: 2, classificationTarget: "brief", expected: { sourceFidelityTarget: 0.88, summaryQualityTarget: 0.87, confidence: 0.87, rationale: "Summary should stay practical and calm." }, activePrediction: { sourceFidelityScore: 0.86, summaryQualityScore: 0.83, confidence: 0.84 }, candidatePrediction: { sourceFidelityScore: 0.89, summaryQualityScore: 0.88, confidence: 0.88 } }),
  createFixture({ id: "brief-transcript-two", sourceName: "Transcript Mirror", title: "Transcript mirror on agent planning workflows", sourceCount: 1, classificationTarget: "brief", expected: { sourceFidelityTarget: 0.86, summaryQualityTarget: 0.85, confidence: 0.82, rationale: "Transcript source remains exception-heavy." }, activePrediction: { sourceFidelityScore: 0.79, summaryQualityScore: 0.8, confidence: 0.79, sourceOmission: true, criticFailed: true }, candidatePrediction: { sourceFidelityScore: 0.86, summaryQualityScore: 0.86, confidence: 0.84 } }),
  createFixture({ id: "brief-hf-tutorial-second", sourceName: "Hugging Face Blog", title: "Builder tutorial note on workflow tooling", sourceCount: 2, classificationTarget: "brief", expected: { sourceFidelityTarget: 0.87, summaryQualityTarget: 0.86, confidence: 0.87, rationale: "Tutorial brief should emphasize practical takeaways." }, activePrediction: { sourceFidelityScore: 0.84, summaryQualityScore: 0.82, confidence: 0.83 }, candidatePrediction: { sourceFidelityScore: 0.88, summaryQualityScore: 0.87, confidence: 0.88 } })
];
