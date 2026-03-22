import { applySupabaseMigrations } from "../shared/supabase-ingest-sync";

await applySupabaseMigrations();

console.log("VibeHub Supabase migrations");
console.log("status: applied");
