import { classifierShadowTrialFixtures } from "../shared/classifier-shadow-trial-fixtures";
import { renderClassifierShadowTrialLog, runClassifierShadowTrial } from "../shared/classifier-shadow-trial";

const report = runClassifierShadowTrial(
  classifierShadowTrialFixtures,
  new Date().toISOString()
);

console.log("VibeHub classifier shadow trial");
console.log(`performed at: ${report.performedAt}`);
console.log(`active model: ${report.activeModel} (${report.activeProvider})`);
console.log(`candidate model: ${report.candidateModel} (${report.candidateProvider})`);
console.log(`sample count: ${report.sampleCount} / ${report.minimumSampleCount}`);
console.log(`remaining samples: ${report.remainingSamples}`);
console.log(`active success rate: ${report.activeMetrics.taskSuccessRate}%`);
console.log(`candidate success rate: ${report.candidateMetrics.taskSuccessRate}%`);
console.log(`active exception inflow: ${report.activeMetrics.exceptionQueueInflow}%`);
console.log(`candidate exception inflow: ${report.candidateMetrics.exceptionQueueInflow}%`);
console.log(`trial outcome: ${report.outcome.result}`);
console.log("");
console.log("Mismatch summary:");

for (const sample of report.samples.filter((entry) => !entry.activeMatched || !entry.candidateMatched)) {
  const activeStatus = sample.activeMatched ? "match" : `miss (${sample.activeExceptionReasons.join("; ")})`;
  const candidateStatus = sample.candidateMatched ? "match" : `miss (${sample.candidateExceptionReasons.join("; ")})`;

  console.log(`- ${sample.title} :: expected ${sample.expectedTargetSurface}/${sample.expectedCategory}`);
  console.log(`  active -> ${activeStatus}`);
  console.log(`  candidate -> ${candidateStatus}`);
}

console.log("");
console.log("Markdown log snippet:");
console.log("");
console.log(renderClassifierShadowTrialLog(report));
