# VibeHub 일일 미디어 발행

## 목적

`daily-auto-publish`에서 새로 `published` 전환된 Brief에 대해 미디어 파이프라인을 실행한다.
두 트랙으로 미디어를 생성한다 (같은 엔진 BriefShort V3 공유, 해상도만 다름):
- **Shorts (9:16)**: Gemini 스크립트 → MimikaStudio 1.7B TTS → Pexels 배경 → Remotion BriefShort V3 → BGM 랜덤 + ffmpeg
- **Longform (16:9)**: Gemini 스크립트 → MimikaStudio 1.7B TTS → Pexels 배경 → Remotion BriefLongform → BGM 랜덤 + ffmpeg
- NotebookLM 팟캐스트 + 아바타 파이프라인은 **동결** (코드 유지, 실행 안 함)

이 프롬프트는 `daily-auto-publish.md` 실행 이후 스케줄러에서 자동 실행된다.

---

## 실행 순서

```
daily-pipeline → daily-editorial-review → daily-drift-guard → daily-auto-publish
  └→ §10 번역 (translate:variant --locale=es)
  └→ daily-media-publish (이것)
      ┌─ Shorts Track (9:16) ───────────────────────────
      │  S1. Gemini 스크립트 (120-140단어, 50-55초)
      │  S2. MimikaStudio 1.7B TTS (owner-jason 클론)
      │  S3. Whisper word-level 자막 (JSON)
      │  S4. Pexels 키워드 배경 이미지 4장 (portrait)
      │  S5. 문장 경계 기반 씬 자동분할 (4씬)
      │  S6. Remotion BriefShort V3 렌더 (1080×1920)
      │      → TransitionSeries 크로스페이드
      │      → UPPERCASE Bold 72px + 금색 하이라이트
      │      → 프로그레스 바 + 워터마크 + CTA
      │  S7. ffmpeg 합성 (음성 + BGM 랜덤 + loudnorm)
      │
      ├─ Longform Track (16:9) ─────────────────────────
      │  L1. Gemini 스크립트 (300-350단어, ~2분)
      │  L2. MimikaStudio 1.7B TTS (동일 클론)
      │  L3. Whisper word-level 자막 (JSON)
      │  L4. Pexels 키워드 배경 이미지 8장 (landscape)
      │  L5. 문장 경계 기반 씬 자동분할 (8씬 + 챕터 카드)
      │  L6. Remotion BriefLongform 렌더 (1920×1080)
      │  L7. ffmpeg 합성 (음성 + BGM 랜덤 + loudnorm)
      │
      └─ 발행 ────────────────────────────────────────
         7. Threads 발행 (publish:channels)
         8. YouTube 업로드 (Shorts + Longform)
         9. 운영자 확인 후 public 전환
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
which /opt/homebrew/opt/ffmpeg-full/bin/ffmpeg  # ffmpeg-full
curl -s -o /dev/null -w "%{http_code}" http://localhost:7693/api/health  # MimikaStudio TTS
ls assets/bgm/*.mp3 | wc -l                    # BGM 라이브러리 (10곡)
```

MimikaStudio가 꺼져있으면: `/Users/family/MimikaStudio/bin/mimikactl backend start`
BGM 없으면: 영상은 생성하되 BGM 없이 음성만 합성.

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

미디어 파이프라인은 brief 1건당 **순차 처리** 기준 약 50분이 소요된다. (2026-03-29 실측)
- NotebookLM 생성 대기: ~10분 (클라우드, `-f brief` 포맷)
- 다운로드 (Claude in Chrome): ~2분
- Whisper STT: ~30초 (base 모델, CPU)
- 아바타 렌더: **~15-32분** (separable_float, MPS, 영상 길이에 비례. 1분 영상 ≈ 15분, 2분 영상 ≈ 32분)
- overlay-avatar.sh + compose-final.sh: ~1분
- Threads 발행: ~30초

> ⚠️ **렌더 시간 주의**: 기존 "~5분" 추정은 틀렸음. 107초 영상 기준 dual 모드(남+녀) 실측 32분 소요.

**하루 최대 2건만 처리한다.** 선정 기준은 당일 발행분 중 quality score 높은 순이다. 오래된 백로그보다 오늘 가장 좋은 콘텐츠를 먼저 영상화한다.

> 수동 모드에서 사용자가 특정 slug를 직접 지정한 경우에는 상한을 무시하고 지정된 건만 처리한다.

### 자동 모드 (기본)
당일(`published_at >= KST 00:00`) 발행된 brief 중 quality score 내림차순으로 상위 2건을 선정한다.

quality score는 `last_editor_note`의 두 가지 패턴에서 파싱한다:
- `auto-approved by review guard (A 94)` → 숫자 94 추출
- `[auto] score=94 grade=A` → 숫자 94 추출 (레거시)

```sql
SELECT id, slug, title, last_editor_note, published_at
FROM public.brief_posts
WHERE status = 'published'
  AND published_at >= date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul'
  AND (
    last_editor_note ~ '\([A-F] \d+\)'   -- auto-approve 형식
    OR last_editor_note LIKE '%score=%'  -- 레거시 형식
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.channel_publish_results
    WHERE brief_slug = brief_posts.slug
      AND channel_name = 'youtube'
      AND success = true
  )
ORDER BY
  COALESCE(
    CAST(substring(last_editor_note FROM '\(([A-F]) (\d+)\)') AS text),  -- "(A 94)" → "94" 방향으로 직접 파싱 불가, 아래 방식 사용
    '0'
  ),
  published_at DESC
LIMIT 2;
```

실제로는 아래 패턴으로 파싱한다 (PostgreSQL regexp_replace):
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
score 파싱이 안 되는 브리프는 quality_score = 0으로 처리해 하단 정렬된다.

### 수동 모드
사용자가 slug를 직접 지정하면 해당 brief로 실행한다.
예: "openai-gpt-5-4-mini-nano-launch로 미디어 파이프라인 실행해줘"

수동 모드에서는:
- `--skip-threads`: Threads 재발행 방지 (이미 발행된 brief일 때)
- `--skip-nlm`: NotebookLM 생성 건너뛰기 (이미 다운로드한 경우)
- `--force`: output 폴더에 final.mp4가 있어도 다시 생성

---

## 3. NotebookLM 비디오 생성

각 brief에 대해:

### 3-1. 노트북 생성 + 소스 추가

```bash
# 기존 노트북 확인
nlm notebook list | grep -i "<slug>"

# 없으면 생성
nlm notebook create "VibeHub: <brief-title>"
nlm source add <notebook-id> --text "<brief-markdown-body>"
```

### 3-2. 오디오 + 비디오 생성

```bash
nlm audio create <notebook-id> -f brief -l short --language en -y
nlm video create <notebook-id> -f brief -s classic --language en -y
```

### 3-3. 완료 대기

```bash
# 30초 간격 폴링, 최대 15분
while true; do
  STATUS=$(nlm studio status <notebook-id>)
  # 모든 artifact이 completed면 break
  sleep 30
done
```

---

## 4. 미디어 다운로드

### Claude in Chrome 자동화 (권장)

Chrome이 열려있고 Claude in Chrome 확장이 활성화된 상태라면:

1. `mcp__Claude_in_Chrome__navigate` → `https://notebooklm.google.com/notebook/<id>`
2. 스튜디오 패널에서 비디오 artifact에 호버
3. ⋮ 버튼 클릭 → "다운로드" 클릭
4. `~/Downloads/`에서 최신 mp4 파일 확인 후 `output/<slug>/`로 이동:

```bash
# 다운로드 폴더에서 가장 최근 mp4 찾기
LATEST=$(ls -t ~/Downloads/*.mp4 2>/dev/null | head -1)
if [ -n "$LATEST" ]; then
  mkdir -p output/<slug>
  mv "$LATEST" output/<slug>/GPT-5.mp4
  echo "✅ Moved: $LATEST → output/<slug>/GPT-5.mp4"
else
  echo "❌ No mp4 found in ~/Downloads/"
fi
```

⚠️ 다운로드 완료까지 대기 후 이동할 것 — 파일 크기가 1MB 미만이면 아직 다운로드 중이거나 HTML 파일임.
```bash
# 파일 검증
file output/<slug>/GPT-5.mp4  # "ISO Media, MP4" 포함 확인
ls -lh output/<slug>/GPT-5.mp4  # 1MB 이상 확인
```

### 수동 대체

Claude in Chrome이 안 되면 사용자에게 수동 다운로드 요청:
```
📥 NotebookLM 웹에서 다운로드 필요:
  노트북: "VibeHub: <title>"
  저장 위치: output/<slug>/video.mp4
```

---

## 5. Whisper STT 자막 생성

```bash
# 오디오 추출
/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg -y \
  -i output/<slug>/video.mp4 \
  -vn -ar 16000 -ac 1 -c:a pcm_s16le \
  output/<slug>/audio-for-stt.wav
```

```python
# faster-whisper로 자막 생성
~/MimikaStudio/venv/bin/python << 'EOF'
from faster_whisper import WhisperModel
model = WhisperModel("base", device="cpu", compute_type="int8")
segments, info = model.transcribe("output/<slug>/audio-for-stt.wav", language="en", word_timestamps=True)
# → output/<slug>/subtitles-en.srt
EOF
```

### 5-1. 스페인어 SRT 자동 번역 (선택)

영어 SRT 생성 후, 스페인어 자막도 자동 생성할 수 있다:

```bash
ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"
set -a && source .env.local 2>/dev/null || source .env 2>/dev/null || true && set +a
npm run video:locale-fanout <slug> --locales=en,es
```

- `GEMINI_API_KEY` 필수 (Gemini로 SRT 텍스트 번역, 타임코드 유지)
- 결과: `output/<slug>/subtitles-es.srt`
- 같은 오디오 + 다른 자막으로 YouTube에 다국어 자막 업로드 가능
- 실패해도 영어 자막은 정상 유지

이 단계는 `GEMINI_API_KEY`가 있을 때만 실행한다. 없으면 skip.

---

## 6. Talking Head 아바타 렌더

### ⚠️ 반드시 아래 설정을 그대로 사용할 것 — 값을 변경하지 마라

### 확정 설정 (2026-03-29 실전 검증 완료, 수정 금지)
- 모델: `separable_float` (standard_float 사용 금지 — 2배 느림)
- FPS: `24`
- 입력 오디오: **`audio-for-stt.wav`** (16kHz mono WAV) — `audio-full.wav` 사용 금지 (48kHz stereo → 화자 감지 오작동)
- 아바타: `assets/brand/vh-avatar.png` (여성), `assets/brand/vh-avatar-male.png` (남성)

### 올바른 CLI (2026-03-29 확인)

```bash
cd /Users/family/jason/vibehub-media
/Users/family/talking-head-anime-3-demo/venv/bin/python \
  tools/talking-head-render.py \
  output/<slug>/audio-for-stt.wav \
  output/<slug> \
  --female-avatar assets/brand/vh-avatar.png \
  --male-avatar assets/brand/vh-avatar-male.png \
  --fps 24 --model separable_float
```

출력: `output/<slug>/avatar-female-alpha.mov`, `avatar-male-alpha.mov`, `avatar-meta.json`

### ⚠️ 반드시 순차 실행 — 동시 실행 절대 금지

두 브리프를 **동시에** 렌더하면 `/tmp/tha3_dual_frames` 공유 폴더 충돌로 프레임이 섞인다.

```
❌ 금지: Brief A 렌더 + Brief B 렌더 동시 실행
✅ 필수: Brief A 렌더 완료 확인 → Brief B 렌더 시작
```

완료 감지: `output/<slug>/avatar-meta.json` 파일 생성 여부로 확인.

```bash
# 완료 대기 루프 (30초 간격)
while [ ! -f output/<slug>/avatar-meta.json ]; do
  echo "렌더 진행 중..."; sleep 30
done
echo "렌더 완료"
```

### nohup 백그라운드 실행 시

```bash
cd /Users/family/jason/vibehub-media
nohup /Users/family/talking-head-anime-3-demo/venv/bin/python \
  tools/talking-head-render.py \
  output/<slug>/audio-for-stt.wav \
  output/<slug> \
  --female-avatar assets/brand/vh-avatar.png \
  --male-avatar assets/brand/vh-avatar-male.png \
  --fps 24 --model separable_float \
  > /tmp/render-<slug-short>.log 2>&1 &
echo "PID: $!"
```

진행 확인: `ls /tmp/tha3_dual_frames/ | grep "^male" | wc -l` (총 프레임 수 대비 진행률)

⚠️ 아바타 이미지가 없으면 이 단계를 skip하고 §7에서 자막만 burn-in.
⚠️ **전신 이미지만 사용** — 클로즈업은 입 변형이 안 됨.

---

## 7. ffmpeg 최종 합성

### ⚠️ 직접 ffmpeg 명령 작성 금지 — 반드시 스크립트를 사용할 것

### overlay-avatar.sh (아바타 + 자막 합성)

`avatar-meta.json`을 읽어 모드(male_solo / female_solo / dual / none) 자동 판별.

```bash
cd /Users/family/jason/vibehub-media
bash tools/overlay-avatar.sh <slug>
# → output/<slug>/final.mp4
```

**필요 파일:**
- `output/<slug>/video.mp4` — NLM 다운로드 영상
- `output/<slug>/subtitles-en.srt` — Whisper STT 자막
- `output/<slug>/avatar-meta.json` — 렌더 모드 정보
- `output/<slug>/avatar-female-alpha.mov` / `avatar-male-alpha.mov` — 아바타

아바타가 없으면(mode=none) 자막만 burn-in으로 자동 처리됨.

---

## 7-2. 아웃트로 + 최종 합성

### outro.mp4 준비 (필수)

`compose-final.sh`는 `output/<slug>/outro.mp4`를 필요로 한다.
**기존 완성된 브리프에서 복사**하면 된다:

```bash
# 이미 완성된 브리프의 outro.mp4 재사용
EXISTING=$(ls /Users/family/jason/vibehub-media/output/*/outro.mp4 2>/dev/null | head -1)
cp "$EXISTING" output/<slug>/outro.mp4
echo "outro.mp4 복사 완료: $EXISTING"
```

Remotion으로 새로 렌더할 경우 (선택):
```bash
npx remotion render packages/media-engine/src/remotion/index.tsx BrandOutro output/<slug>/outro.mp4
```

### 최종 합성

```bash
cd /Users/family/jason/vibehub-media
bash tools/compose-final.sh <slug>
# → output/<slug>/complete.mp4
```

compose-final.sh가 자동으로:
1. 음성 끝나는 시점 자동 감지 (silencedetect, -30dB 기준)
2. 본편 → 아웃트로: fade-out/fade-in (0.5초)
3. 모든 파일 규격 통일 (24fps, 48000Hz stereo)

⚠️ compose-final.sh를 직접 실행할 것 — ffmpeg 명령을 자체 생성하지 마라.
⚠️ `output/<slug>/outro.mp4`가 없으면 compose-final.sh가 실패한다. 반드시 위 복사 단계를 먼저 실행.

---

## 8. YouTube 자동 업로드 + Threads 발행

### ⚠️ 반드시 영상 렌더 완료 후 실행할 것

`publish:channels`가 `output/<slug>/` 폴더에서 영상 파일을 자동 감지하여 YouTube Data API v3로 업로드한다.

**영상 파일 감지:**
- `shorts.mp4` → YouTube Shorts (9:16, #Shorts 태그)
- `longform.mp4` → YouTube 일반 영상 (16:9)

**업로드 모드 자동 전환:**
- `YOUTUBE_CLIENT_ID` + `YOUTUBE_CLIENT_SECRET` + `YOUTUBE_REFRESH_TOKEN` 설정됨 → **API 자동 업로드** (unlisted)
- 환경변수 미설정 → 로컬 메타데이터 JSON 저장 (수동 업로드)

파이프라인 순서:
```
영상 렌더 (Shorts + Longform) → publish:channels
  ├─ Threads 자동 발행
  ├─ YouTube Longform 자동 업로드 (unlisted)
  ├─ YouTube Shorts 자동 업로드 (unlisted, #Shorts 태그)
  ├─ Podcast: WAV → MP3 → Supabase Storage → feed.xml 갱신 → Spotify 자동 감지
  ├─ brief_posts.youtube_video_id 자동 연결
  └─ channel_publish_results DB 기록 + Telegram 보고
```

**Podcast 자동화 (2026-03-30 추가):**
- `output/<slug>/longform-voice.wav` (또는 `shorts-voice.wav`) 감지 시 자동 실행
- WAV → ffmpeg MP3 (192kbps, loudnorm -16 LUFS) → Supabase Storage `podcast` bucket 업로드
- feed.xml 갱신 + 업로드 → Spotify가 1-2시간 내 자동 감지
- 환경변수: `SUPABASE_SERVICE_ROLE_KEY` (이미 설정됨)
- Spotify RSS URL: `https://hzxsropbcjfywmospobb.supabase.co/storage/v1/object/public/podcast/feed-es.xml`

### 자동 모드
```bash
cd /Users/family/jason/vibehub-media
npm run publish:channels <slug>
# → Threads 자동 발행
# → YouTube Longform 업로드 (unlisted) + brief 자동 연결
# → YouTube Shorts 업로드 (unlisted, #Shorts 태그)
# → DB channel_publish_results 기록 (youtube + youtube-shorts)
# → Telegram 보고
```

### 수동 모드 (이미 Threads 발행된 경우)
```bash
npm run publish:channels <slug> -- --skip-threads
```

### YouTube OAuth2 설정 (최초 1회)
```bash
npm run youtube:setup -- /path/to/client_secret.json
# → 브라우저에서 Google 로그인 → .env.local에 토큰 자동 저장
```

### 운영자 확인 후 공개 전환
업로드된 영상은 `unlisted` 상태. YouTube Studio에서 확인 후 `public`으로 전환.
자동 전환은 의도적으로 제외 — 품질 확인 후 수동 공개.

---

## 8-3. 썸네일 생성 안내

현재 썸네일은 API 무료 티어에서 이미지 생성 불가 (IPM=0).
Gemini로 썸네일 프롬프트만 자동 생성하고, 실제 이미지는 AI Studio 웹에서 수동 생성한다.

### 썸네일 프롬프트 생성

```
You are a YouTube thumbnail designer. Given this AI tech brief title, generate a Gemini image generation prompt.

Rules:
- Style: bold, eye-catching, minimal text
- Color scheme: dark background (#0A0A0A) with orange accent (#F97316) and purple (#7C3AED)
- Include the main subject/icon related to the topic
- Text on thumbnail: max 5 words, large bold font
- 16:9 aspect ratio, 1280x720

Brief title: {title}
```

### 출력

`output/<slug>/thumbnail-prompt.txt`에 저장.

### 수동 단계

```
📸 썸네일 생성:
  1. https://aistudio.google.com 접속
  2. thumbnail-prompt.txt의 프롬프트 복붙
  3. 생성된 이미지 다운로드 → output/<slug>/thumbnail.jpg
```

⚠️ 썸네일 API 자동화는 유료 전환 시 추가 (Imagen 4 Fast $0.02/장).

---

## 9. 결과 보고

Telegram으로 전체 결과를 보고한다:

```
🎬 [VibeHub] Media Publish
Brief: "<title>"

✅ NotebookLM: video generated (1m 55s)
✅ Download: completed
✅ Whisper STT: 48 segments
✅ Avatar: 2568 frames (32m render, dual mode)
  ✅ Compose: final.mp4 (5.8MB)
  ✅ Threads: published
✅ YouTube guide: ready
✅ Next step: upload manually → /vh-youtube 또는 publish:link-youtube

📁 output/<slug>/
  final.mp4 — YouTube 업로드용
  subtitles-en.srt — 자막
  youtube-upload-guide.txt — 복붙 가이드
```

---

## 10. 실패 처리

| 단계 | 실패 시 동작 |
|------|------------|
| NotebookLM 생성 | skip, 에러 보고 |
| 다운로드 | 수동 다운로드 요청 알림 |
| Whisper STT | skip (자막 없이 진행) |
| 아바타 렌더 | skip (자막만 burn-in) |
| ffmpeg 합성 | skip, 원본 비디오 유지 |
| Threads 발행 | 에러 로그, 수동 재시도 안내 |
| Gemini 스크립트 | skip Shorts 트랙, Long-form만 진행 |
| MimikaStudio TTS | skip Shorts 트랙 (서버 미기동) |
| Pexels API | fallback: Brief cover_image_url을 4씬 공통 배경으로 사용 |
| Remotion Shorts | skip, 에러 보고 |

**한 단계 실패가 전체를 중단시키지 않는다** — 가능한 단계까지 진행 후 결과 보고.

---

## 11. 행동 원칙

- `published` 상태 brief만 대상 — draft/review는 절대 건드리지 않음
- 동일 brief 중복 미디어 생성 방지: `output/<slug>/complete.mp4`(Long-form) 또는 `output/<slug>/shorts.mp4`(Shorts)가 이미 존재하면 해당 트랙 skip
- 아바타 렌더는 **반드시 순차 실행** — 두 브리프 동시 렌더 금지 (`/tmp/tha3_dual_frames` 충돌)
- 아바타 없으면 자막만 burn-in으로 대체 (graceful degradation)
- 렌더 시간 예상: 107초 영상 기준 dual 모드 ~32분 (Apple Silicon MPS, 2026-03-29 실측)
- `publish:channels`는 **반드시 complete.mp4 생성 후** 실행 — 영상 없이 먼저 실행 금지
- output 경로 구분: 영상 → `output/<slug>/`, publish:channels 결과 → `apps/backend/output/<slug>/`
- NLM 다운로드는 **Claude in Chrome만** 가능 — Playwright/httpx 직접 다운로드는 Google 인증 루프로 실패
- public YouTube 연결은 자동 polling하지 않는다. 운영자가 업로드 후 명시적으로 `/vh-youtube` 또는 `publish:link-youtube`를 실행한다.
- **NLM 합성 여성음 ZCR 오분류 주의**: NLM female voice의 median ZCR은 약 1385Hz로, 기존 2000Hz 경계를 사용하면 77% 프레임이 male로 오분류되어 dual 아바타 또는 여성음에 남성 아바타가 표시됨. `talking-head-render.py`의 ZCR 경계를 1200Hz로 수정 완료 (2026-03-29). 만약 아바타 모드가 의심스러우면 `avatar-meta.json`을 직접 확인하고 필요시 `female_solo`로 수동 수정.

---

## 12. 중간 파일 자동 정리

7일 이상 된 output 폴더의 중간 파일(avatar MOV, WAV, intro/outro 등)을 자동 삭제한다.
`complete.mp4`, `subtitles-en.srt`, `youtube-upload-guide.txt`, `avatar-meta.json`만 보관.

```bash
bash tools/cleanup-media.sh --days 7
```

이 단계는 미디어 발행 완료 후 매일 자동 실행된다.
`--dry-run`으로 삭제 대상 미리 확인 가능.
