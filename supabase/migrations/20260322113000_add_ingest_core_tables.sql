create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null,
  base_url text not null,
  source_tier text not null check (source_tier in ('auto-safe', 'render-required', 'manual-review-required', 'blocked')),
  enabled boolean not null default true,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_sources_tier_enabled
  on sources (source_tier, enabled);

create table if not exists ingest_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources(id) on delete cascade,
  run_status text not null check (run_status in ('queued', 'fetching', 'parsed', 'classified', 'drafted', 'review', 'approved', 'scheduled', 'published', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ingest_runs_source_started
  on ingest_runs (source_id, started_at desc);

create table if not exists ingested_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources(id) on delete cascade,
  run_id uuid references ingest_runs(id) on delete set null,
  title text not null,
  url text not null,
  content_type text not null,
  raw_content jsonb not null default '{}'::jsonb,
  parsed_content jsonb not null default '{}'::jsonb,
  dedupe_key text not null,
  ingest_status text not null default 'fetched' check (ingest_status in ('fetched', 'parsed', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_ingested_items_source_created
  on ingested_items (source_id, created_at desc);

create index if not exists idx_ingested_items_dedupe_key
  on ingested_items (dedupe_key);

create table if not exists item_classifications (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null unique references ingested_items(id) on delete cascade,
  category text not null,
  importance_score numeric(5,2),
  novelty_score numeric(5,2),
  target_surface text not null check (target_surface in ('brief', 'discover', 'both', 'archive', 'discard')),
  reason text,
  duplicate_of uuid references ingested_items(id) on delete set null,
  confidence numeric(5,2),
  policy_flags jsonb not null default '[]'::jsonb,
  exception_reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_item_classifications_surface
  on item_classifications (target_surface, category);
