import { applySupabasePublishAction } from "../../shared/supabase-editorial-actions";

export function applyPublishAction(args: Parameters<typeof applySupabasePublishAction>[0]) {
  return applySupabasePublishAction(args);
}
