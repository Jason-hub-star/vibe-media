# VibeHub Media Hub Schema

## Supabase Tables
- `sources`
- `ingest_runs`
- `ingested_items`
- `item_classifications`
- `brief_posts`
  - trigger: `trg_fix_approved_draft` — `review_status = approved` && `status = draft` → 자동 `status = review` 전환 (상태 꼬임 방지)
- `discover_items`
- `discover_actions`
- `source_entries`
- `newsletter_subscribers`
- `video_jobs`
  - 내부 영상 파이프라인 상태를 관리한다.
  - raw video는 DB blob이 아니라 metadata만 저장한다.
  - core fields: `source_session`, `kind`, `status`, `asset_link_state`, `transcript_state`
  - storage fields: `raw_file_path`, `raw_file_size_bytes`, `raw_sha256`, `duration_ms`, `storage_tier`
  - pipeline fields: `highlight_count`, `risky_segment_count`, `next_action`, `proxy_asset_path`, `preview_asset_path`
  - publish fields: `private_upload_id`, `parent_review_status`, `blocked_reason`
- `admin_reviews`
- `asset_slots`
- `showcase_entries`
- `showcase_links`
- `ingest_run_attempts`
- `video_job_attempts`
- `channel_publish_results`
  - 채널별 발행 결과 이력. brief_slug + channel_name + created_at으로 추적.
  - core fields: `brief_slug`, `channel_name`, `success`, `published_url`, `error_message`
  - meta fields: `dry_run`, `duration_ms`, `created_at`
  - 인덱스: brief_slug+created_at desc, channel_name+success+created_at desc
- `publish_dispatches`
  - 발행 배치 단위 기록. 한 번의 publish:channels 실행 = 1개 dispatch.
  - core fields: `brief_slug`, `channels` (text[]), `all_success`, `dry_run`, `duration_ms`

## Shared Contracts
- `BriefListItem`
- `BriefDetail`
- `DiscoverItem`
- `InboxItem`
- `ReviewItem`
- `IngestRun`
- `VideoJob`
- `AssetSlot`
- `ShowcaseEntry`
- `ShowcaseTeaser`

## Pipeline Notes
- `sources`는 수집 원천을 관리한다. DB가 SSOT이며 `pipeline:live-fetch`가 직접 읽는다.
  - core fields: `name`, `kind`, `base_url`, `source_tier`, `enabled`
  - fetch fields: `feed_url`, `content_type`, `default_tags`, `max_items`, `fetch_kind`, `github_owner`, `github_repo`
  - tracking fields: `last_success_at`, `last_failure_at`, `failure_reason`
- `ingest_runs`는 개별 실행 단위를 기록한다.
  - core fields: `source_id`, `run_status`, `started_at`, `finished_at`, `error_message`
- `ingested_items`는 source에서 들어온 개별 결과를 저장한다.
  - core fields: `source_id`, `run_id`, `title`, `url`, `content_type`, `dedupe_key`
- `item_classifications`는 `brief | discover | both | archive | discard` 판정을 가진다.
  - core fields: `item_id`, `category`, `importance_score`, `novelty_score`, `target_surface`
- `brief_posts`와 `discover_items`는 공개 surface와 admin review/publish control surface가 함께 보는 editorial spine이다.
  - identity fields: `id` (uuid PK), `slug` (text, unique), `title` (text), `summary` (text)
  - content fields: `body` (jsonb), `source_links` (jsonb), `source_count` (integer), `cover_image_url` (text, nullable)
  - relation fields: `source_item_id` (uuid FK → ingested_items, nullable)
  - lifecycle fields: `status` (text: draft/review/scheduled/published), `review_status` (text: pending/approved/changes_requested/rejected), `scheduled_at` (timestamptz), `published_at` (timestamptz)
  - editor fields: `last_editor_note` (text, nullable — quality fail 사유 등 기록)
- `admin_reviews`는 review queue spine이다.
- `ingest_run_attempts`와 `video_job_attempts`는 retry / failure history를 기록한다.
- `video_jobs`는 공개 surface가 아니라 내부 `watch folder -> auto analysis -> CapCut -> parent review -> private upload` 흐름을 관리한다.
- `showcase_entries`와 `showcase_links`는 자동 ingest spine이 아니라 수동 큐레이션 sidecar lane을 위한 별도 저장소다.
- `showcase_entries` core fields:
  - `slug`, `title`, `summary`, `body`
  - `cover_asset`, `tags`, `primary_link_*`
  - `review_status`, `scheduled_at`, `published_at`
  - `origin`, `created_by`, `submitted_by`, `author_label`
  - `source_discover_item_id`, `featured_home`, `featured_radar`, `display_order`
- `public` schema에는 위 allowlist만 유지한다. legacy public tables는 SQL backup 후 cleanup 대상이다.
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
- 공개 `/radar` 페이지는 `review_status = 'approved' AND published_at IS NOT NULL`인 항목만 노출한다 (`isPublished` 가드).

## Showcase Notes
- showcase는 `target_surface` 자동 분류 결과가 아니다.
- showcase는 `brief/discover`와 같은 공개 셸을 공유하지만 ingest/classification/sync 본선에는 올라가지 않는다.
- 나중에 로그인 기반 사용자 제출이 들어와도 같은 showcase lane 안에서만 검수/게시되도록 설계한다.
