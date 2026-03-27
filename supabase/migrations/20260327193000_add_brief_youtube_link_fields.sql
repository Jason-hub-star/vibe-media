alter table public.brief_posts
  add column if not exists youtube_video_id text,
  add column if not exists youtube_url text,
  add column if not exists youtube_linked_at timestamptz;

comment on column public.brief_posts.youtube_video_id is 'Canonical YouTube video id linked after manual upload completion';
comment on column public.brief_posts.youtube_url is 'Canonical public YouTube URL linked to the brief';
comment on column public.brief_posts.youtube_linked_at is 'Timestamp when the YouTube upload was officially linked to the brief';

create index if not exists idx_brief_posts_youtube_linked_at
  on public.brief_posts (youtube_linked_at desc nulls last);
