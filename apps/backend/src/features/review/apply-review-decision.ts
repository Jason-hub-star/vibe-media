import { applySupabaseReviewDecision } from "../../shared/supabase-editorial-actions";

export function applyReviewDecision(args: Parameters<typeof applySupabaseReviewDecision>[0]) {
  return applySupabaseReviewDecision(args);
}
