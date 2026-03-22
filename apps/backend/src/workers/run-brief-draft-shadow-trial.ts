import { renderBriefDraftShadowTrialLog, runBriefDraftShadowTrial } from "../shared/brief-draft-shadow-trial";

const report = runBriefDraftShadowTrial(undefined, new Date().toISOString());

console.log("VibeHub brief draft shadow trial");
console.log(`performed at: ${report.performedAt}`);
console.log(`active model: ${report.activeModel} (${report.activeProvider})`);
console.log(`candidate model: ${report.candidateModel} (${report.candidateProvider})`);
console.log(`sample count: ${report.sampleCount} / ${report.minimumSampleCount}`);
console.log(`active success rate: ${report.metrics.active.taskSuccessRate}%`);
console.log(`candidate success rate: ${report.metrics.candidate.taskSuccessRate}%`);
console.log(`active exception inflow: ${report.metrics.active.exceptionQueueInflow}%`);
console.log(`candidate exception inflow: ${report.metrics.candidate.exceptionQueueInflow}%`);
console.log(`trial outcome: ${report.outcome.result}`);
console.log("");
console.log("Markdown log snippet:");
console.log("");
console.log(renderBriefDraftShadowTrialLog(report));
