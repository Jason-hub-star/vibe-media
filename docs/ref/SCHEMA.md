# VibeHub Media Hub Schema

## Supabase Tables
- `sources`
- `ingest_runs`
- `ingested_items`
- `item_classifications`
- `brief_posts`
- `discover_items`
- `discover_actions`
- `source_entries`
- `newsletter_subscribers`
- `video_jobs`
- `admin_reviews`
- `asset_slots`

## Shared Contracts
- `BriefListItem`
- `BriefDetail`
- `DiscoverItem`
- `InboxItem`
- `ReviewItem`
- `IngestRun`
- `VideoJob`
- `AssetSlot`

## Pipeline Notes
- `sources`는 수집 원천을 관리한다.
  - core fields: `name`, `kind`, `base_url`, `source_tier`, `enabled`
- `ingest_runs`는 개별 실행 단위를 기록한다.
  - core fields: `source_id`, `run_status`, `started_at`, `finished_at`, `error_message`
- `ingested_items`는 source에서 들어온 개별 결과를 저장한다.
  - core fields: `source_id`, `run_id`, `title`, `url`, `content_type`, `dedupe_key`
- `item_classifications`는 `brief | discover | both | archive | discard` 판정을 가진다.
  - core fields: `item_id`, `category`, `importance_score`, `novelty_score`, `target_surface`
- `brief_posts`와 `discover_items`는 공개 surface로 올라간 편집 결과다.
- `item_classifications`에는 아래 개념이 필요하다.
  - `target_surface`
  - confidence
  - policy flags
  - exception reason

## Discovery Notes
- `discover_items`는 공개 디스커버리 허브와 admin registry가 함께 본다.
- category는 `docs/ref/DISCOVERY-TAXONOMY.md`를 기준으로 관리한다.
- action link는 복수 허용이며 빠른 이동과 다운로드를 지원한다.
- briefs로 승격되기 전 단계의 리소스도 `discover_items`에서 관리할 수 있어야 한다.
