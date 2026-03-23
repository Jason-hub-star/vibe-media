import { runAllShadowTrials } from "../shared/shadow-trial-suite";

const report = runAllShadowTrials();

console.log("VibeHub shadow trial suite");
console.log(`performed at: ${report.performedAt}`);
console.log(`overall status: ${report.overallStatus}`);
console.log(`exit code: ${report.exitCode}`);
console.log("mode: fixture-backed baseline validation");
console.log("");
console.log("Stage outcomes:");

for (const stage of report.stages) {
  console.log(`- ${stage.stage}: ${stage.result}`);
  console.log(`  next action -> ${stage.nextAction}`);
}

console.log("");
console.log("Notes:");
for (const note of report.notes) {
  console.log(`- ${note}`);
}

process.exit(report.exitCode);
