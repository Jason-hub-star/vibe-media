-- Channel publish results — 채널별 발행 결과 추적
-- 확장성: 새 채널 추가 시 channel_name에 값만 추가하면 됨

create table if not exists public.channel_publish_results (
  id            uuid primary key default gen_random_uuid(),
  brief_slug    text not null references public.brief_posts(slug),
  channel_name  text not null,
  success       boolean not null default false,
  published_url text,
  error_message text,
  dry_run       boolean not null default false,
  duration_ms   integer,
  created_at    timestamptz not null default now()
);

comment on table public.channel_publish_results is '채널별 발행 결과 이력. brief_slug + channel_name + created_at으로 추적.';
comment on column public.channel_publish_results.channel_name is 'threads | ghost | tistory | youtube | spotify | podcast-rss 등 확장 가능';

-- 조회 성능: brief별 최근 발행 결과
create index if not exists idx_channel_publish_brief_slug
  on public.channel_publish_results (brief_slug, created_at desc);

-- 조회 성능: 채널별 성공률 분석
create index if not exists idx_channel_publish_channel
  on public.channel_publish_results (channel_name, success, created_at desc);

-- 발행 배치 추적 (dispatcher 단위)
create table if not exists public.publish_dispatches (
  id            uuid primary key default gen_random_uuid(),
  brief_slug    text not null,
  channels      text[] not null default '{}',
  all_success   boolean not null default false,
  dry_run       boolean not null default false,
  duration_ms   integer,
  created_at    timestamptz not null default now()
);

comment on table public.publish_dispatches is '발행 배치 단위 기록. 한 번의 publish:channels 실행 = 1개 dispatch.';

create index if not exists idx_publish_dispatches_slug
  on public.publish_dispatches (brief_slug, created_at desc);

-- RLS 활성화
alter table public.channel_publish_results enable row level security;
alter table public.publish_dispatches enable row level security;

-- service_role만 쓰기 가능
create policy "service_role_channel_publish" on public.channel_publish_results
  for all using (true) with check (true);

create policy "service_role_publish_dispatches" on public.publish_dispatches
  for all using (true) with check (true);
