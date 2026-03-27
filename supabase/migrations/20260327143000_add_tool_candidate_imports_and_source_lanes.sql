alter table if exists public.sources
  add column if not exists pipeline_lane text not null default 'editorial'
    check (pipeline_lane in ('editorial', 'tool_candidate'));

alter table if exists public.sources
  add column if not exists github_search_query text;

create index if not exists idx_sources_lane_enabled
  on public.sources (pipeline_lane, enabled, source_tier);

create table if not exists public.tool_candidate_imports (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  summary text not null,
  description text not null default '',
  website_url text not null,
  github_url text,
  demo_url text,
  docs_url text,
  tags jsonb not null default '[]'::jsonb,
  status text not null check (
    status in (
      'imported',
      'approved_for_listing',
      'promoted_to_showcase',
      'hidden_from_listing',
      'duplicate_blocked',
      'rejected',
      'spam_blocked'
    )
  ),
  screening_status text not null check (
    screening_status in ('pending', 'passed', 'failed', 'duplicate', 'spam_blocked')
  ),
  screening_score double precision not null default 0,
  screening_notes jsonb not null default '[]'::jsonb,
  source_id uuid not null references public.sources(id) on delete cascade,
  source_name_snapshot text not null,
  source_entry_url text not null,
  source_entry_external_id text,
  source_locale text not null default 'en',
  target_locales jsonb not null default '[]'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  imported_at timestamptz not null default now(),
  promoted_showcase_entry_id uuid references public.showcase_entries(id) on delete set null,
  linked_submission_id uuid references public.tool_submissions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tool_candidate_imports_source_entry_key
  on public.tool_candidate_imports (source_id, source_entry_url);

create index if not exists idx_tool_candidate_imports_status_created
  on public.tool_candidate_imports (status, imported_at desc);

create index if not exists idx_tool_candidate_imports_source_created
  on public.tool_candidate_imports (source_id, imported_at desc);

create index if not exists idx_tool_candidate_imports_website
  on public.tool_candidate_imports (website_url);

create index if not exists idx_tool_candidate_imports_source_entry
  on public.tool_candidate_imports (source_entry_url);

alter table public.tool_candidate_imports enable row level security;
alter table public.tool_candidate_imports force row level security;

create or replace function public.set_tool_candidate_import_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_tool_candidate_imports_updated_at on public.tool_candidate_imports;

create trigger trg_tool_candidate_imports_updated_at
  before update on public.tool_candidate_imports
  for each row execute function public.set_tool_candidate_import_updated_at();
