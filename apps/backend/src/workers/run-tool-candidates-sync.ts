import { runToolCandidateSync } from "../shared/tool-candidate-pipeline";

const report = await runToolCandidateSync();
const approvedCount = report.imports.filter((item) => item.status === "approved_for_listing").length;
const syncedLabel = report.source === "supabase" ? "imports persisted" : "imports prepared";

console.log("VibeHub imported tool candidate sync");
console.log(`performed at: ${report.performedAt}`);
console.log(`sync target: ${report.source}`);
console.log(`${syncedLabel}: ${report.imports.length}`);
console.log(`approved listings: ${approvedCount}`);
console.log(`screening errors: ${report.errors.length}`);
