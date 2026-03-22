export type {
  ClassifierShadowTrialExpected,
  ClassifierShadowTrialFixture,
  ClassifierShadowTrialPrediction,
  ClassifierTrialCategory
} from "./classifier-shadow-trial-fixture-types";

import { classifierShadowTrialBaseFixtures } from "./classifier-shadow-trial-base-fixtures";
import { classifierShadowTrialGateFixtures } from "./classifier-shadow-trial-gate-fixtures";

export const classifierShadowTrialFixtures = [
  ...classifierShadowTrialBaseFixtures,
  ...classifierShadowTrialGateFixtures
];
