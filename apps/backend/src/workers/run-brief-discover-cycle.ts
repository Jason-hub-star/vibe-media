import { runBriefDiscoverCycle } from "../shared/brief-discover-cycle";
import { deriveInboxNextQueue } from "../shared/pipeline-routing";

const report = runBriefDiscoverCycle();

console.log("VibeHub brief/discover dry-run");
console.log(`cycle started: ${report.cycleStartedAt}`);
console.log(`sources touched: ${report.sourcesTouched}`);
console.log(`inbox items: ${report.inboxItems.length}`);
console.log(`review items: ${report.reviewItems.length}`);
console.log(`publish items: ${report.publishItems.length}`);
console.log(`exception items: ${report.exceptionItems.length}`);
console.log(`archive items: ${report.archiveItems.length}`);
console.log(`discard items: ${report.discardItems.length}`);
console.log("");
console.log("Queue summary:");

for (const item of report.inboxItems) {
  console.log(
    `- ${item.title} :: ${item.targetSurface} -> ${deriveInboxNextQueue(item)} (${item.sourceTier}, confidence ${item.confidence})`
  );
}
