alter table if exists brief_posts
  add column if not exists review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'changes_requested', 'rejected')),
  add column if not exists scheduled_at timestamptz,
  add column if not exists last_editor_note text;

alter table if exists discover_items
  add column if not exists review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'changes_requested', 'rejected')),
  add column if not exists scheduled_at timestamptz,
  add column if not exists published_at timestamptz;

alter table if exists admin_reviews
  add column if not exists reviewed_at timestamptz;

create table if not exists ingest_run_attempts (
  id uuid primary key default gen_random_uuid(),
  ingest_run_id uuid not null references ingest_runs(id) on delete cascade,
  target_type text not null default 'ingest_run' check (target_type in ('source', 'ingest_run')),
  target_id uuid not null,
  attempt_no integer not null,
  stage text not null,
  status text not null,
  error_message text,
  retryable boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_ingest_run_attempts_run_attempt
  on ingest_run_attempts (ingest_run_id, attempt_no);

create index if not exists idx_ingest_run_attempts_stage_created
  on ingest_run_attempts (stage, created_at desc);

create table if not exists video_job_attempts (
  id uuid primary key default gen_random_uuid(),
  video_job_id uuid not null references video_jobs(id) on delete cascade,
  target_type text not null default 'video' check (target_type in ('video')),
  target_id uuid not null,
  attempt_no integer not null,
  stage text not null,
  status text not null,
  error_message text,
  retryable boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_video_job_attempts_job_attempt
  on video_job_attempts (video_job_id, attempt_no);

create index if not exists idx_video_job_attempts_stage_created
  on video_job_attempts (stage, created_at desc);
