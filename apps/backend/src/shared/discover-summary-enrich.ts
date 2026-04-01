import OpenAI from "openai";
import { createSupabaseSql } from "./supabase-postgres";

const MODEL = "gpt-4o-mini";
const BATCH_SIZE = 10;
const RATE_LIMIT_MS = 500;

interface ThinDiscoverRow {
  id: string;
  title: string;
  summary: string;
  category: string;
  source_url: string | null;
  source_title: string | null;
  content_markdown: string | null;
}

interface EnrichResult {
  id: string;
  title: string;
  oldSummary: string;
  newSummary: string | null;
  error: string | null;
}

const SYSTEM_PROMPT = `You are an editorial copywriter for a tech discovery hub called VibeHub Radar.
Your job: rewrite a raw changelog or thin summary into a concise, informative 1–2 sentence editorial blurb for a card UI.

Rules:
- Max 160 characters. Prefer shorter.
- Write in English. Third person. No marketing fluff.
- Lead with WHAT changed or WHY it matters, not the version number.
- If it's a minor dependency bump or CI-only change, say so honestly (e.g. "Maintenance release with dependency updates.").
- Never start with "This release..." — vary your openings.
- No markdown, no links, no emoji.
- If the input is too vague to summarize meaningfully, return exactly: SKIP`;

function buildUserPrompt(row: ThinDiscoverRow): string {
  const parts = [`Title: ${row.title}`, `Category: ${row.category}`];
  if (row.source_url) parts.push(`Source: ${row.source_url}`);
  parts.push(`Raw summary: ${row.summary}`);
  if (row.content_markdown) {
    const preview = row.content_markdown.slice(0, 800);
    parts.push(`Source content (first 800 chars):\n${preview}`);
  }
  return parts.join("\n");
}

function isThinSummary(summary: string): boolean {
  const s = summary.trim();
  if (s.length < 40) return true;
  if (/^updated dependencies\.?$/i.test(s)) return true;
  if (/^changes since /i.test(s)) return true;
  if (/^(ci|internal)[\s:]/i.test(s) && s.length < 60) return true;
  if (/^release\s+update\s+for\s+/i.test(s)) return true;
  if (/^##\s*\d/m.test(s)) return true;
  if (/full changelog:/i.test(s) && s.length < 80) return true;
  if (/^maintenance:/i.test(s) && s.length < 50) return true;
  return false;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runDiscoverSummaryEnrich(dryRun = false) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is required");

  const client = new OpenAI({ apiKey });
  const sql = createSupabaseSql();

  try {
    const rows = await sql<ThinDiscoverRow[]>`
      SELECT
        di.id,
        di.title,
        di.summary,
        di.category,
        ii.url AS source_url,
        ii.title AS source_title,
        ii.parsed_content->>'contentMarkdown' AS content_markdown
      FROM discover_items di
      LEFT JOIN ingested_items ii ON ii.id = di.source_item_id
      WHERE di.review_status = 'approved'
      ORDER BY di.created_at DESC
    `;

    const thin = rows.filter((r) => isThinSummary(r.summary));
    console.log(`Found ${rows.length} approved items, ${thin.length} need enrichment`);

    if (thin.length === 0) return { scanned: rows.length, enriched: 0, skipped: 0, errors: 0, results: [], dryRun };

    const results: EnrichResult[] = [];

    for (let i = 0; i < thin.length; i += BATCH_SIZE) {
      const batch = thin.slice(i, i + BATCH_SIZE);

      for (const row of batch) {
        const result: EnrichResult = { id: row.id, title: row.title, oldSummary: row.summary, newSummary: null, error: null };

        try {
          const response = await client.chat.completions.create({
            model: MODEL,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: buildUserPrompt(row) }
            ],
            max_tokens: 200,
            temperature: 0.3
          });

          const text = (response.choices[0]?.message?.content ?? "").trim();

          if (text === "SKIP" || text.length < 10) {
            result.error = "SKIP";
          } else {
            const clean = text.replace(/^["']|["']$/g, "").trim();
            const clamped = clean.length > 180 ? `${clean.slice(0, 177)}...` : clean;
            result.newSummary = clamped;

            if (!dryRun) {
              await sql`
                UPDATE discover_items
                SET summary = ${clamped}
                WHERE id = ${row.id}
              `;
            }
          }
        } catch (error) {
          result.error = error instanceof Error ? error.message : String(error);
        }

        results.push(result);
        await sleep(RATE_LIMIT_MS);
      }
    }

    return {
      scanned: rows.length,
      enriched: results.filter((r) => r.newSummary).length,
      skipped: results.filter((r) => r.error === "SKIP").length,
      errors: results.filter((r) => r.error && r.error !== "SKIP").length,
      results,
      dryRun
    };
  } finally {
    await sql.end({ timeout: 5000 });
  }
}
