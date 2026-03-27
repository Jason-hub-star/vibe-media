alter table if exists public.sources
  add column if not exists feed_url text;

alter table if exists public.sources
  add column if not exists content_type text not null default 'article';

alter table if exists public.sources
  add column if not exists default_tags text[] not null default '{}'::text[];

alter table if exists public.sources
  add column if not exists max_items integer not null default 10;

alter table if exists public.sources
  add column if not exists fetch_kind text not null default 'rss';

alter table if exists public.sources
  add column if not exists github_owner text;

alter table if exists public.sources
  add column if not exists github_repo text;

create unique index if not exists idx_sources_lane_name_unique
  on public.sources (pipeline_lane, name);

insert into public.sources (
  name,
  kind,
  base_url,
  source_tier,
  enabled,
  failure_reason,
  feed_url,
  content_type,
  default_tags,
  max_items,
  fetch_kind,
  github_search_query,
  pipeline_lane
)
values
  (
    'Hacker News Show HN',
    'hn-show',
    'https://news.ycombinator.com/showhn.html',
    'auto-safe',
    true,
    null,
    null,
    'article',
    array['show-hn', 'launch', 'indie'],
    10,
    'hn-show',
    null,
    'tool_candidate'
  ),
  (
    'GitHub Search: developer tools',
    'github-search',
    'https://github.com/search',
    'auto-safe',
    true,
    null,
    null,
    'repo',
    array['github', 'open-source', 'tooling'],
    8,
    'github-search',
    'topic:developer-tools archived:false is:public stars:>10',
    'tool_candidate'
  ),
  (
    'DevHunt',
    'rss',
    'https://devhunt.org/',
    'render-required',
    false,
    'render-required',
    'https://devhunt.org/rss.xml',
    'article',
    array['devtools', 'launch', 'community'],
    8,
    'rss',
    null,
    'tool_candidate'
  ),
  (
    'LeanVibe',
    'rss',
    'https://leanvibe.io/',
    'manual-review-required',
    false,
    'manual-review-required',
    'https://leanvibe.io/rss',
    'article',
    array['community', 'projects', 'manual-review'],
    8,
    'rss',
    null,
    'tool_candidate'
  ),
  (
    'BetaList',
    'rss',
    'https://betalist.com/',
    'manual-review-required',
    false,
    'manual-review-required',
    'https://betalist.com/feed',
    'article',
    array['launch', 'startup', 'manual-review'],
    8,
    'rss',
    null,
    'tool_candidate'
  ),
  (
    'Product Hunt',
    'rss',
    'https://www.producthunt.com/',
    'manual-review-required',
    false,
    'manual-review-required',
    'https://www.producthunt.com/feed',
    'article',
    array['launch', 'manual-review', 'products'],
    8,
    'rss',
    null,
    'tool_candidate'
  )
on conflict (pipeline_lane, name) do update set
  kind = excluded.kind,
  base_url = excluded.base_url,
  source_tier = excluded.source_tier,
  feed_url = excluded.feed_url,
  content_type = excluded.content_type,
  default_tags = excluded.default_tags,
  max_items = excluded.max_items,
  fetch_kind = excluded.fetch_kind,
  github_search_query = excluded.github_search_query,
  enabled = public.sources.enabled,
  failure_reason = coalesce(public.sources.failure_reason, excluded.failure_reason);
