# VibeHub 일일 미디어 발행

## 목적

`daily-auto-publish`에서 새로 `published` 전환된 Brief에 대해 미디어 파이프라인을 실행한다.
두 트랙으로 미디어를 생성한다 (같은 엔진 BriefShort V3 공유, 해상도만 다름):
- **Shorts (9:16)**: Gemini 스크립트 (80-100단어) → MimikaStudio **Chatterbox** TTS (2문장 청크) → Pexels 배경 → Remotion BriefShort V3 → BGM 랜덤 + ffmpeg
- **Longform (16:9)**: Gemini 스크립트 (300-350단어) → MimikaStudio **Chatterbox** TTS (2문장 청크) → Pexels 배경 → Remotion BriefLongform → BGM 랜덤 + ffmpeg

이 프롬프트는 `daily-auto-publish.md` 실행 이후 스케줄러에서 자동 실행된다.

---

## 실행 순서

```
daily-pipeline → daily-editorial-review → daily-drift-guard → daily-auto-publish
  └→ §10 번역 (translate:variant --locale=es)
  └→ daily-media-publish (이것)
      ┌─ Shorts Track (9:16) ───────────────────────────
      │  S1. Gemini 스크립트 (80-100단어, ~50초, 스페인어)
      │  S2. MimikaStudio Chatterbox TTS (woman-es 클론, 2문장 청크)
      │      → hallucination 감지: 청크 duration > 단어수×1.2초 → 재시도
      │  S3. whisper-cpp word-level 자막 (--output-json-full)
      │      → 구두점 토큰 이전 단어에 병합
      │  S4. Pexels 키워드 배경 비디오 4개 (portrait, 중복 제거)
      │  S5. 프레임 균등 씬 분할 (4씬)
      │  S6. Remotion BriefShort V3 렌더 (1080×1920)
      │      → 타이틀 카드 (0~2.5초, 썸네일 겸용)
      │      → 자막 (2.5초 이후)
      │      → CTA 아웃트로 (마지막 2.5초)
      │  S7. ffmpeg 합성 (음성 + BGM 랜덤 + loudnorm + 동적 fadeOut)
      │
      ├─ Longform Track (16:9) ─────────────────────────
      │  L1. Gemini 스크립트 (300-350단어, ~2분, 스페인어)
      │  L2. MimikaStudio Chatterbox TTS (woman-es, 2문장 청크)
      │  L3. whisper-cpp word-level 자막 (--output-json-full)
      │  L4. Pexels 키워드 배경 비디오 8개 (landscape, 중복 제거)
      │  L5. 프레임 균등 씬 분할 (8씬 + 챕터 카드)
      │  L6. Remotion BriefLongform 렌더 (1920×1080)
      │  L7. ffmpeg 합성 (음성 + BGM 랜덤 + loudnorm + 동적 fadeOut)
      │
      └─ 발행 (EN 원본 + ES 확장) ──────────────────────
         7. EN 발행: Threads EN + YouTube EN (publish:channels)
            - YouTube: API 설정 + mp4 존재 시만 자동 업로드, 아니면 로컬 메타
            - Podcast: EN 음성 WAV → MP3 → feed.xml (canonicalLocale 기준 1회)
         8. ES 발행: brief_post_variants에서 ES variant 자동 조회 → 듀얼 dispatch
            - Threads ES: variant title/body로 별도 게시
            - YouTube ES: locale별 publisher 재등록 (language, briefUrl ES 반영)
            - Podcast ES: ES 음성 WAV 감지 → feed-es.xml 별도 업로드
            - Newsletter ES: publish:channels 범위 밖, 별도 newsletter:send 워커
         9. 운영자 확인 후 YouTube public 전환
```

---

## 1. 사전 확인

```bash
ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"
set -a && source .env.local 2>/dev/null || source .env 2>/dev/null || true && set +a
echo "SUPABASE_DB_URL: ${SUPABASE_DB_URL:+set}"
echo "GEMINI_API_KEY: ${GEMINI_API_KEY:+set}"
echo "THREADS_ACCESS_TOKEN: ${THREADS_ACCESS_TOKEN:+set}"
```

필수: `SUPABASE_DB_URL`, `THREADS_ACCESS_TOKEN`, `PEXELS_API_KEY`
선택: `GEMINI_API_KEY` (스크립트 생성)

### 도구 확인

```bash
which ffmpeg                                    # ffmpeg
curl -s -o /dev/null -w "%{http_code}" http://localhost:7693/api/health  # MimikaStudio
/opt/homebrew/Cellar/whisper-cpp/1.8.4/bin/whisper-cli --help >/dev/null 2>&1 && echo "whisper OK"
ls models/ggml-base.bin                         # whisper 모델
ls assets/bgm/*.mp3 | wc -l                    # BGM 라이브러리 (10곡)
```

MimikaStudio가 꺼져있으면: `/Users/family/MimikaStudio/bin/mimikactl backend start`
⚠️ Chatterbox 모델 필요: `~/.cache/huggingface/hub/models--mlx-community--chatterbox-fp16`

### BGM 랜덤 선택

```bash
BGM=$(ls assets/bgm/*.mp3 | shuf -n 1)
echo "Selected BGM: $BGM"
```

10곡 라이브러리에서 랜덤 선택. `assets/bgm/` 참조:
- 01-calm-ambient, 02-dark-pulse, 03-warm-pad, 04-tension-build, 05-bright-tech
- 06-deep-bass, 07-ethereal, 08-urgent, 09-dreamy, 10-cinematic

---

## 2. 대상 Brief 선정

### ⚠️ 일일 처리 상한: 최대 2건

미디어 파이프라인은 brief 1건당 약 10-15분이 소요된다.

**하루 최대 2건만 처리한다.** 선정 기준은 당일 발행분 중 quality score 높은 순이다.

> 수동 모드에서 사용자가 특정 slug를 직접 지정한 경우에는 상한을 무시하고 지정된 건만 처리한다.

### 자동 모드 (기본)
당일(`published_at >= KST 00:00`) 발행된 brief 중 quality score 내림차순으로 상위 2건을 선정한다.

quality score는 `last_editor_note`의 두 가지 패턴에서 파싱한다:
- `auto-approved by review guard (A 94)` → 숫자 94 추출
- `[auto] score=94 grade=A` → 숫자 94 추출 (레거시)

```sql
SELECT id, slug, title, last_editor_note, published_at,
  CAST(
    COALESCE(
      regexp_replace(last_editor_note, '^.*\([A-F] (\d+)\).*$', '\1'),
      regexp_replace(last_editor_note, '^.*score=(\d+).*$', '\1'),
      '0'
    ) AS integer
  ) AS quality_score
FROM public.brief_posts
WHERE status = 'published'
  AND published_at >= date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul'
  AND NOT EXISTS (
    SELECT 1 FROM public.channel_publish_results
    WHERE brief_id = brief_posts.id AND channel = 'youtube' AND status = 'success'
  )
ORDER BY quality_score DESC, published_at DESC
LIMIT 2;
```

당일 발행분이 0건이면 "미디어 발행 대상 없음"으로 종료.

### 수동 모드
사용자가 slug를 직접 지정하면 해당 brief로 실행한다.

수동 모드에서는:
- `--skip-threads`: Threads 재발행 방지 (이미 발행된 brief일 때)
- `--force`: output 폴더에 영상이 있어도 다시 생성

---

## 3. 영상 생성 (Shorts + Longform)

각 brief에 대해 `video:render` CLI 워커를 실행한다.
기존 shorts.mp4/longform.mp4가 있으면 자동 skip.

```bash
cd /Users/family/jason/vibehub-media

# 기본: Shorts + Longform 둘 다 렌더
npm run video:render -w @vibehub/backend -- <slug>

# Shorts만
npm run video:render -w @vibehub/backend -- <slug> --shorts-only

# Longform만
npm run video:render -w @vibehub/backend -- <slug> --longform-only

# 스페인어
npm run video:render -w @vibehub/backend -- <slug> --locale=es

# Dry-run (스크립트만 생성, 렌더 없음)
npm run video:render -w @vibehub/backend -- <slug> --dry-run
```

파이프라인: Gemini 스크립트 (80-100w ES) → Chatterbox TTS (2문장 청크) → whisper-cpp word-level → Pexels 비디오 배경 → Remotion BriefShort V3 → ffmpeg+BGM

⚠️ 기본 locale은 `es` (스페인어). 영어는 `--locale=en` 명시 필요.
⚠️ 기존 mp4 있으면 skip. 재생성은 `--force` 필요.

---

## 4. 채널 발행

### ⚠️ 반드시 영상 렌더 완료 후 실행할 것

`publish:channels`가 `output/<slug>/` 폴더에서 영상 파일을 자동 감지하여 발행한다.

**영상 파일 감지:**
- `shorts.mp4` → YouTube Shorts (9:16, #Shorts 태그)
- `longform.mp4` → YouTube 일반 영상 (16:9)

**업로드 모드 자동 전환:**
- `YOUTUBE_CLIENT_ID` + `YOUTUBE_CLIENT_SECRET` + `YOUTUBE_REFRESH_TOKEN` 설정됨 → **API 자동 업로드** (unlisted)
- 환경변수 미설정 → 로컬 메타데이터 JSON 저장 (수동 업로드)

```bash
cd /Users/family/jason/vibehub-media
npm run publish:channels <slug>
# Pass 1: EN 원본 발행
#   → Threads EN 자동 발행
#   → YouTube Longform EN 업로드 (unlisted, API 설정 시) + brief 자동 연결
#   → YouTube Shorts EN 업로드 (unlisted, longform과 별도 파일 존재 시)
#   → Podcast: canonicalLocale 기준 WAV → MP3 → Supabase → feed.xml
# Pass 2: ES variant 발행 (brief_post_variants에 ES 존재 시)
# → DB channel_publish_results 기록 (locale별)
# → Telegram 보고
```

### YouTube OAuth2 설정 (최초 1회)
```bash
npm run youtube:setup -- /path/to/client_secret.json
```

### 운영자 확인 후 공개 전환
업로드된 영상은 `unlisted` 상태. YouTube Studio에서 확인 후 `public`으로 전환.

---

## 5. 썸네일 생성 안내

현재 썸네일은 API 무료 티어에서 이미지 생성 불가 (IPM=0).
Gemini로 썸네일 프롬프트만 자동 생성하고, 실제 이미지는 AI Studio 웹에서 수동 생성한다.

`output/<slug>/thumbnail-prompt.txt`에 저장.

---

## 6. 결과 보고

Telegram으로 전체 결과를 보고한다:

```
🎬 [VibeHub] Media Publish
Brief: "<title>"

✅ Shorts: rendered (1080×1920, 52s)
✅ Longform: rendered (1920×1080, 2m 05s)
✅ Threads: published
✅ YouTube: uploaded (unlisted)
✅ Podcast: feed.xml updated
```

---

## 7. 실패 처리

| 단계 | 실패 시 동작 |
|------|------------|
| Gemini 스크립트 | skip 해당 트랙, 에러 보고 |
| MimikaStudio TTS | skip 해당 트랙 (서버 미기동) |
| Pexels API | fallback: Brief cover_image_url을 공통 배경으로 사용 |
| Remotion 렌더 | skip, 에러 보고 |
| Threads 발행 | 에러 로그, 수동 재시도 안내 |
| YouTube 업로드 | 로컬 메타데이터 저장, 수동 안내 |

**한 단계 실패가 전체를 중단시키지 않는다** — 가능한 단계까지 진행 후 결과 보고.

---

## 8. 행동 원칙

- `published` 상태 brief만 대상 — draft/review는 절대 건드리지 않음
- 동일 brief 중복 미디어 생성 방지: `output/<slug>/shorts.mp4` 또는 `longform.mp4`가 이미 존재하면 해당 트랙 skip
- `publish:channels`는 **반드시 영상 생성 후** 실행 — 영상 없이 먼저 실행 금지
- output 경로 구분: 영상 → `output/<slug>/`, publish:channels 결과 → `apps/backend/output/<slug>/`
- public YouTube 연결은 자동 polling하지 않는다. 운영자가 업로드 후 명시적으로 `/vh-youtube` 또는 `publish:link-youtube`를 실행한다.

---

## 9. 중간 파일 자동 정리

7일 이상 된 output 폴더의 중간 파일(WAV, intro/outro 등)을 자동 삭제한다.
`shorts.mp4`, `longform.mp4`, `subtitles-en.srt`, `youtube-upload-guide.txt`만 보관.

```bash
bash tools/cleanup-media.sh --days 7
```
