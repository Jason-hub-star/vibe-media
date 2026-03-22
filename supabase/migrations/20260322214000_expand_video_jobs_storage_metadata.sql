alter table if exists video_jobs
  add column if not exists raw_file_path text,
  add column if not exists raw_file_size_bytes bigint,
  add column if not exists raw_sha256 text,
  add column if not exists duration_ms integer,
  add column if not exists storage_tier text not null default 'local'
    check (storage_tier in ('local', 'nas', 'archive')),
  add column if not exists proxy_asset_path text,
  add column if not exists preview_asset_path text;

create index if not exists idx_video_jobs_status_storage_tier
  on video_jobs (status, storage_tier);

create unique index if not exists idx_video_jobs_raw_sha256_source_session
  on video_jobs (raw_sha256, source_session)
  where raw_sha256 is not null;
