-- Add cover image URL column to brief_posts
alter table public.brief_posts
  add column if not exists cover_image_url text;

comment on column public.brief_posts.cover_image_url is 'OG image or enclosure URL from source article';
