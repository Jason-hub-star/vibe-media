create table if not exists showcase_entries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  body jsonb not null default '[]'::jsonb,
  cover_asset text,
  tags jsonb not null default '[]'::jsonb,
  primary_link_kind text not null,
  primary_link_label text not null,
  primary_link_href text not null,
  review_status text not null check (review_status in ('draft', 'pending', 'approved', 'changes_requested', 'rejected')),
  scheduled_at timestamptz,
  published_at timestamptz,
  origin text not null check (origin in ('editorial', 'imported', 'user_submission')),
  created_by text,
  submitted_by text,
  author_label text,
  source_discover_item_id uuid references discover_items(id) on delete set null,
  featured_home boolean not null default false,
  featured_radar boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_showcase_entries_display
  on showcase_entries (display_order asc, published_at desc);

create index if not exists idx_showcase_entries_home
  on showcase_entries (featured_home, published_at desc);

create index if not exists idx_showcase_entries_radar
  on showcase_entries (featured_radar, published_at desc);

create table if not exists showcase_links (
  id uuid primary key default gen_random_uuid(),
  showcase_entry_id uuid not null references showcase_entries(id) on delete cascade,
  link_kind text not null,
  label text not null,
  href text not null,
  position integer not null default 0
);

create unique index if not exists idx_showcase_links_position
  on showcase_links (showcase_entry_id, position);

alter table public.showcase_entries enable row level security;
alter table public.showcase_links enable row level security;
alter table public.showcase_entries force row level security;
alter table public.showcase_links force row level security;
