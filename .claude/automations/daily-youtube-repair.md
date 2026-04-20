# VibeHub 일일 YouTube 복구 + 공개 전환

## 목적

`daily-media-publish` 이후 남는 YouTube 운영 누락을 자동 복구한다.

1. **누락 업로드 백필**: published brief인데 YouTube `https://` 성공 이력이 없는 항목을 `publish:channels`로 재시도
2. **공개 전환**: 업로드된 YouTube 영상의 `unlisted/private`를 `public`으로 승격

---

## 실행 순서

```
daily-auto-publish
  └→ daily-media-publish
      └→ daily-youtube-repair (이것)
```

---

## 1. 사전 확인

```bash
ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"
set -a && source .env.local 2>/dev/null || source .env 2>/dev/null || true && set +a
echo "SUPABASE_DB_URL: ${SUPABASE_DB_URL:+set}"
echo "YOUTUBE_CLIENT_ID: ${YOUTUBE_CLIENT_ID:+set}"
echo "YOUTUBE_CLIENT_SECRET: ${YOUTUBE_CLIENT_SECRET:+set}"
echo "YOUTUBE_REFRESH_TOKEN: ${YOUTUBE_REFRESH_TOKEN:+set}"
```

- `SUPABASE_DB_URL` 없으면 중단
- YouTube 자격증명이 없으면 백필만 실행하고 공개 전환은 스킵

---

## 2. Dry-run 점검

```bash
ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"
set -a && source .env.local 2>/dev/null || source .env 2>/dev/null || true && set +a
npm run youtube:repair -- --days=30 --limit=10 --dry-run
```

---

## 3. 실제 실행

```bash
ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"
set -a && source .env.local 2>/dev/null || source .env 2>/dev/null || true && set +a
npm run youtube:repair -- --days=30 --limit=10
```

옵션:
- `--skip-backfill`: 백필 스킵 (공개 전환만)
- `--skip-public`: 공개 전환 스킵 (백필만)

---

## 4. 안전장치

- published brief만 대상으로 한다.
- 최근 `days` 윈도우 안에서만 처리한다.
- 한 번에 최대 `limit`개만 처리한다.
- 기본 동작은 **이미 YouTube 성공 이력이 있는 항목을 재업로드하지 않는다**.
- 백필 시 `PUBLISH_CHANNELS=youtube`로 강제해 Threads/Podcast 재발행을 막는다.
- `output/<slug>/longform.mp4` 또는 `output/<slug>/shorts.mp4`가 없는 slug는 백필에서 건너뛴다.

---

## 🔖 운영자 승인 대기 항목

(아래 항목은 자동 실행되지 않았습니다. 운영자가 확인 후 결정합니다.)

[PENDING-유튜브공개]
- unlisted 영상 공개 전환: 썸네일/제목/설명 확인 후 공개 승격
→ 승인 시: "YouTube Studio에서 public 전환" 또는 "재렌더 필요"

[PENDING-백필재시도]
- 백필 실패 항목: 영상 파일 확인 후 재시도 결정
→ 승인 시: "`npm run youtube:repair --days=30 --limit=5`" 재실행

---

## 5. 결과 보고 예시

```
Summary
  backfill checked: 4
  backfill triggered: 2
  backfill failed: 0
  public checked: 6
  public promoted: 3
  public already: 3
  public failed: 0
```

경고/실패(`failed > 0`)가 있으면 Telegram 보고에 포함한다.

---

## 6. 매일 체크 (쉬운 버전)

아래 3가지만 매일 보면 된다.

1. **공개 상태**
   - 오늘 업로드 영상이 `public`인지 확인
2. **링크 연결 상태**
   - brief에 YouTube `https://` URL이 연결됐는지 확인
3. **썸네일 상태**
   - `thumbnail.png`가 실제 적용됐는지 확인

주간 운영(권장):
- 주 1회 썸네일/제목 개선 실험 1건만 수행 (CTR 개선용)
