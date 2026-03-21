alter table video_jobs
  add column if not exists transcript_state text not null default 'missing',
  add column if not exists highlight_count integer not null default 0,
  add column if not exists risky_segment_count integer not null default 0,
  add column if not exists next_action text not null default 'Await operator handoff',
  add column if not exists private_upload_id text,
  add column if not exists parent_review_status text,
  add column if not exists blocked_reason text;
