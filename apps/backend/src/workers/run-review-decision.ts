import { applyReviewDecision } from "../features/review/apply-review-decision";

const [reviewId, decision, ...noteParts] = process.argv.slice(2);

if (!reviewId || !decision) {
  throw new Error("usage: tsx src/workers/run-review-decision.ts <reviewId> <approve|changes_requested|reject> [note]");
}

const result = await applyReviewDecision({
  reviewId,
  decision: decision as "approve" | "changes_requested" | "reject",
  note: noteParts.join(" ") || null
});

console.log(JSON.stringify(result, null, 2));
