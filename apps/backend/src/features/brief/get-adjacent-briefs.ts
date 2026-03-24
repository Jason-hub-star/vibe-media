import { listSupabaseBriefs } from "../../shared/supabase-editorial-read";

export interface AdjacentBriefs {
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
}

/** Return prev/next published briefs relative to the given slug. */
export async function getAdjacentBriefs(slug: string): Promise<AdjacentBriefs> {
  const all = await listSupabaseBriefs();
  if (!all) return { prev: null, next: null };

  const published = all.filter((b) => b.status === "published");
  const idx = published.findIndex((b) => b.slug === slug);

  if (idx === -1) return { prev: null, next: null };

  const prev = idx > 0 ? { slug: published[idx - 1].slug, title: published[idx - 1].title } : null;
  const next = idx < published.length - 1 ? { slug: published[idx + 1].slug, title: published[idx + 1].title } : null;

  return { prev, next };
}
