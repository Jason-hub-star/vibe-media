alter table if exists public.showcase_entries
  add column if not exists featured_submit_hub boolean not null default false;

create index if not exists idx_showcase_entries_submit_hub
  on public.showcase_entries (featured_submit_hub, published_at desc);

create table if not exists public.tool_submissions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  description text not null default '',
  website_url text not null,
  github_url text,
  demo_url text,
  docs_url text,
  tags jsonb not null default '[]'::jsonb,
  submitter_email text not null,
  submitter_name text,
  status text not null check (
    status in (
      'submitted',
      'screened',
      'approved_for_listing',
      'promoted_to_showcase',
      'screening_failed',
      'rejected',
      'spam_blocked'
    )
  ),
  screening_status text not null check (
    screening_status in ('pending', 'passed', 'failed', 'duplicate', 'spam_blocked')
  ),
  screening_score double precision not null default 0,
  screening_notes jsonb not null default '[]'::jsonb,
  origin_ip_hash text,
  user_agent_hash text,
  source_locale text not null default 'en',
  target_locales jsonb not null default '[]'::jsonb,
  submitted_by_account_id uuid,
  promoted_showcase_entry_id uuid references public.showcase_entries(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tool_submissions_status_created
  on public.tool_submissions (status, created_at desc);

create index if not exists idx_tool_submissions_email_created
  on public.tool_submissions (submitter_email, created_at desc);

create index if not exists idx_tool_submissions_website
  on public.tool_submissions (website_url);

create index if not exists idx_tool_submissions_origin_ip
  on public.tool_submissions (origin_ip_hash);

create index if not exists idx_tool_submissions_account
  on public.tool_submissions (submitted_by_account_id);

alter table public.tool_submissions enable row level security;
alter table public.tool_submissions force row level security;

create or replace function public.set_tool_submission_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_tool_submissions_updated_at on public.tool_submissions;

create trigger trg_tool_submissions_updated_at
  before update on public.tool_submissions
  for each row execute function public.set_tool_submission_updated_at();
