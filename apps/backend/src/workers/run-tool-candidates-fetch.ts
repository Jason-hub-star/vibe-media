import { runToolCandidateFetch } from "../shared/tool-candidate-pipeline";

const report = await runToolCandidateFetch();

console.log("VibeHub imported tool candidate fetch");
console.log(`performed at: ${report.performedAt}`);
console.log(`sources attempted: ${report.sourceStatuses.length}`);
console.log(`candidates fetched: ${report.candidates.length}`);
console.log("");
console.log("Source statuses:");
for (const status of report.sourceStatuses) {
  const note = status.note ? ` (${status.note})` : "";
  console.log(`- ${status.sourceName}: ${status.status} ${status.itemCount}${note}`);
}
