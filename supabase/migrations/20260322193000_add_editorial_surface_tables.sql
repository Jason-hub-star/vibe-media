alter table if exists brief_posts
  add column if not exists source_item_id uuid unique references ingested_items(id) on delete set null,
  add column if not exists source_links jsonb not null default '[]'::jsonb,
  add column if not exists source_count integer not null default 0;

create table if not exists discover_items (
  id uuid primary key default gen_random_uuid(),
  source_item_id uuid unique references ingested_items(id) on delete cascade,
  slug text not null unique,
  title text not null,
  category text not null,
  summary text not null,
  status text not null check (status in ('tracked', 'watching', 'featured')),
  tags jsonb not null default '[]'::jsonb,
  highlighted boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_discover_items_status
  on discover_items (status, created_at desc);

create table if not exists discover_actions (
  id uuid primary key default gen_random_uuid(),
  discover_item_id uuid not null references discover_items(id) on delete cascade,
  action_kind text not null,
  label text not null,
  href text not null,
  position integer not null default 0
);

create unique index if not exists idx_discover_actions_item_position
  on discover_actions (discover_item_id, position);

create index if not exists idx_admin_reviews_target
  on admin_reviews (target_type, target_id);
