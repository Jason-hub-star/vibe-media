import {
  runToolCandidateFetch,
  runToolCandidateScreen,
  runToolCandidateSync,
} from "../shared/tool-candidate-pipeline";

const fetchReport = await runToolCandidateFetch();
const screenReport = await runToolCandidateScreen();
const syncReport = await runToolCandidateSync();

console.log("VibeHub imported tool candidate pipeline");
console.log(`performed at: ${syncReport.performedAt}`);
console.log(`sources attempted: ${fetchReport.sourceStatuses.length}`);
console.log(`candidates fetched: ${fetchReport.candidates.length}`);
console.log(`candidates screened: ${screenReport.candidates.length}`);
console.log(`imports synced: ${syncReport.imports.length}`);
console.log(`screening errors: ${syncReport.errors.length}`);
