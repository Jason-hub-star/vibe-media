create table if not exists brief_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  body jsonb not null default '[]'::jsonb,
  status text not null default 'draft',
  published_at timestamptz
);

create table if not exists source_entries (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  category text not null,
  href text not null,
  freshness text not null
);

create table if not exists newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists video_jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null,
  status text not null,
  asset_link_state text not null,
  source_session text not null
);

create table if not exists admin_reviews (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid not null,
  review_status text not null,
  notes text
);

create table if not exists asset_slots (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slot_type text not null,
  path text not null,
  ratio text not null,
  min_size text not null,
  format text not null
);
