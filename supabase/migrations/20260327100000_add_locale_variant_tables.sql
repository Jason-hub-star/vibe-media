-- i18n locale variant tables — brief/discover 다국어 변형 저장
-- Phase 1: en(canonical) + es(first target)

-- =========================================================================
-- 1. brief_post_variants — brief 다국어 변형
-- =========================================================================

create table if not exists public.brief_post_variants (
  id                  uuid primary key default gen_random_uuid(),
  canonical_id        uuid not null references public.brief_posts(id) on delete cascade,
  locale              text not null,
  title               text not null,
  summary             text not null,
  body                jsonb not null default '[]'::jsonb,
  translation_status  text not null default 'pending'
    check (translation_status in ('pending','translated','quality_failed','published')),
  quality_status      text not null default 'pending'
    check (quality_status in ('pending','passed','failed')),
  publish_status      text not null default 'draft'
    check (publish_status in ('draft','scheduled','published')),
  translated_at       timestamptz,
  quality_checked_at  timestamptz,
  published_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.brief_post_variants
  is 'brief_posts의 다국어 변형. canonical_id + locale 유니크.';

create unique index if not exists idx_brief_variants_canonical_locale
  on public.brief_post_variants (canonical_id, locale);

create index if not exists idx_brief_variants_locale_status
  on public.brief_post_variants (locale, translation_status);

-- =========================================================================
-- 2. discover_item_variants — discover 다국어 변형 (body 없음)
-- =========================================================================

create table if not exists public.discover_item_variants (
  id                  uuid primary key default gen_random_uuid(),
  canonical_id        uuid not null references public.discover_items(id) on delete cascade,
  locale              text not null,
  title               text not null,
  summary             text not null,
  translation_status  text not null default 'pending'
    check (translation_status in ('pending','translated','quality_failed','published')),
  quality_status      text not null default 'pending'
    check (quality_status in ('pending','passed','failed')),
  publish_status      text not null default 'draft'
    check (publish_status in ('draft','scheduled','published')),
  translated_at       timestamptz,
  quality_checked_at  timestamptz,
  published_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.discover_item_variants
  is 'discover_items의 다국어 변형. canonical_id + locale 유니크.';

create unique index if not exists idx_discover_variants_canonical_locale
  on public.discover_item_variants (canonical_id, locale);

create index if not exists idx_discover_variants_locale_status
  on public.discover_item_variants (locale, translation_status);

-- =========================================================================
-- 3. channel_publish_results에 locale 컬럼 추가
-- =========================================================================

alter table public.channel_publish_results
  add column if not exists locale text not null default 'en';

comment on column public.channel_publish_results.locale
  is '발행 locale (en, es 등). 기본값 en으로 기존 row 호환.';

-- =========================================================================
-- 4. RLS 활성화 + service_role 정책
-- =========================================================================

alter table public.brief_post_variants enable row level security;
alter table public.discover_item_variants enable row level security;

drop policy if exists "service_role_brief_variants" on public.brief_post_variants;
create policy "service_role_brief_variants" on public.brief_post_variants
  for all using (true) with check (true);

drop policy if exists "service_role_discover_variants" on public.discover_item_variants;
create policy "service_role_discover_variants" on public.discover_item_variants
  for all using (true) with check (true);

-- =========================================================================
-- 5. updated_at 자동 갱신 트리거
-- =========================================================================

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_brief_variants_updated_at on public.brief_post_variants;
create trigger trg_brief_variants_updated_at
  before update on public.brief_post_variants
  for each row execute function public.set_updated_at();

drop trigger if exists trg_discover_variants_updated_at on public.discover_item_variants;
create trigger trg_discover_variants_updated_at
  before update on public.discover_item_variants
  for each row execute function public.set_updated_at();
