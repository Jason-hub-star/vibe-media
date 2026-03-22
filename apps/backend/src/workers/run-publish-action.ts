import { applyPublishAction } from "../features/publish/apply-publish-action";

const [targetType, targetId, action, at] = process.argv.slice(2);

if (!targetType || !targetId || !action) {
  throw new Error("usage: tsx src/workers/run-publish-action.ts <brief|discover> <targetId> <schedule|publish> [iso-datetime]");
}

const result = await applyPublishAction({
  targetType: targetType as "brief" | "discover",
  targetId,
  action: action as "schedule" | "publish",
  scheduledAt: action === "schedule" ? (at ?? new Date().toISOString()) : undefined,
  publishedAt: action === "publish" ? (at ?? new Date().toISOString()) : undefined
});

console.log(JSON.stringify(result, null, 2));
