alter table public.discover_items
  add column if not exists cover_image_url text;
