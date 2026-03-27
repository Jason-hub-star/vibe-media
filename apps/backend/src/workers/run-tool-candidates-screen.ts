import { runToolCandidateScreen } from "../shared/tool-candidate-pipeline";

const report = await runToolCandidateScreen();
const approvedCount = report.candidates.filter((item) => item.status === "approved_for_listing").length;

console.log("VibeHub imported tool candidate screening");
console.log(`performed at: ${report.performedAt}`);
console.log(`candidates screened: ${report.candidates.length}`);
console.log(`approved for listing: ${approvedCount}`);
console.log(`screening errors: ${report.errors.length}`);
if (report.errors.length > 0) {
  console.log("");
  console.log("Screening errors:");
  for (const error of report.errors.slice(0, 10)) {
    console.log(`- ${error.title}: ${error.message}`);
  }
}
