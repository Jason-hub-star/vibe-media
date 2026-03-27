# VibeHub 일일 미디어 발행

## 목적

`daily-auto-publish`에서 새로 `published` 전환된 Brief에 대해 미디어 파이프라인을 실행한다.
NotebookLM 비디오 생성 → 다운로드 → 자막 생성 → 토킹 아바타 렌더 → 최종 합성 → YouTube 가이드 생성.

이 프롬프트는 `daily-auto-publish.md` 실행 이후 스케줄러에서 자동 실행된다.

---

## 실행 순서

```
daily-pipeline → daily-editorial-review → daily-drift-guard → daily-auto-publish
  └→ §10 번역 (translate:variant --locale=es)
  └→ daily-media-publish (이것)
      1. NotebookLM 비디오 생성 (nlm CLI)
      2. 다운로드 (Claude in Chrome)
      3. Whisper STT 자막
      3-1. 스페인어 SRT 번역 (video:locale-fanout, 선택)
      4. Talking Head 아바타 렌더
      5. ffmpeg 최종 합성
      6. YouTube 가이드 TXT
      7. Threads 발행 (publish:channels)
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

필수: `SUPABASE_DB_URL`, `THREADS_ACCESS_TOKEN`
선택: `GEMINI_API_KEY` (자막 번역용)

### 도구 확인

```bash
nlm auth status                    # NotebookLM CLI 인증
which /opt/homebrew/opt/ffmpeg-full/bin/ffmpeg  # ffmpeg-full (libass)
ls ~/talking-head-anime-3-demo/venv/bin/python  # talking-head-anime
ls ~/MimikaStudio/venv/bin/python               # faster-whisper
```

하나라도 없으면 해당 단계를 skip하고 보고한다.

---

## 2. 대상 Brief 선정

### ⚠️ 일일 처리 상한: 최대 2건

미디어 파이프라인은 brief 1건당 **순차 처리** 기준 약 19분이 소요된다. (2026-03-27 실측)
- NotebookLM 생성 대기: ~10분 (클라우드, `-f brief` 포맷)
- 다운로드 (Claude in Chrome): ~2분
- Whisper STT: ~30초 (base 모델, CPU)
- 아바타 렌더: ~5분 (separable_float, MPS ~10fps, 2분 영상 기준)
- Remotion 인트로/아웃트로 + compose-final.sh: ~1분
- Threads 발행: ~30초

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

### 확정 설정 (2026-03-27 검증 완료, 수정 금지)
- 모델: `separable_float` (standard_float 사용 금지 — 2배 느림)
- FPS: `24`
- 이미지 전처리: **비율 유지 투명 패딩** (512x512 강제 리사이즈 금지 — 찌그러짐+입 안 움직임 원인)
  ```python
  # 올바른 방법 (패딩)
  img = Image.open(avatar_path).convert("RGBA")
  new_h = int(img.height * (512 / img.width))
  img_resized = img.resize((512, new_h), Image.LANCZOS)
  canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
  canvas.paste(img_resized, (0, 0))

  # 금지: img.resize((512, 512)) — 찌그러짐 발생
  ```

```bash
~/talking-head-anime-3-demo/venv/bin/python \
  tools/talking-head-render.py \
  output/<slug>/avartar.png \
  output/<slug>/audio-full.wav \
  output/<slug>/avatar.mp4 \
  --fps 24 --model separable_float
```

아바타 탐색 순서:
1. `output/<slug>/avartar.png` (slug별 커스텀)
2. `assets/brand/vh-avatar.png` (공용 기본값)

⚠️ 아바타 이미지가 둘 다 없으면 이 단계를 skip한다.
⚠️ **전신 이미지만 사용** — 클로즈업은 입 변형이 안 됨.
⚠️ **512x512 강제 리사이즈 금지** — 반드시 투명 패딩 방식 사용.

---

## 7. ffmpeg 최종 합성

### ⚠️ 반드시 아래 명령어를 그대로 사용할 것 — 값을 변경하지 마라

### 확정 레이아웃 (2026-03-27 검증 완료, 수정 금지)
- 아바타: `scale=600:-1` (600px 폭, 비율 자동)
- 위치: `overlay=W-420:H-330` (우하단, NLM 워터마크 가림)
- 자막: `Alignment=2` (하단 중앙), `FontSize=20`, `MarginV=20`
- 코덱: `libx264 -crf 20`
- ffmpeg 경로: `/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg`

```bash
/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg -y \
  -i output/<slug>/video.mp4 \
  -i output/<slug>/avatar-alpha.mov \
  -filter_complex " \
    [1:v]scale=600:-1[avatar]; \
    [0:v][avatar]overlay=W-420:H-330:shortest=1[vid]; \
    [vid]subtitles=output/<slug>/subtitles-en.srt:force_style='FontSize=20,FontName=Arial,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Shadow=1,MarginV=20,Alignment=2'[out]" \
  -map "[out]" -map 0:a \
  -c:v libx264 -crf 20 -preset fast -c:a copy -shortest \
  output/<slug>/final.mp4
```

아바타가 없으면 자막만 burn-in:
```bash
/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg -y \
  -i output/<slug>/video.mp4 \
  -vf "subtitles=output/<slug>/subtitles-en.srt:force_style='FontSize=20,FontName=Arial,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Shadow=1,MarginV=20,Alignment=2'" \
  -c:v libx264 -crf 20 -preset fast -c:a copy \
  output/<slug>/final.mp4
```

---

## 7-2. Remotion 인트로/아웃트로 + 최종 합성

### 인트로/아웃트로 렌더
```bash
npx remotion render packages/media-engine/src/remotion/index.tsx BrandIntro output/<slug>/intro.mp4 --props='{"title":"<brief-title>","subtitle":"AI-curated tech insights"}'
npx remotion render packages/media-engine/src/remotion/index.tsx BrandOutro output/<slug>/outro.mp4
```

### 최종 합성
```bash
bash tools/compose-final.sh <slug>
# → output/<slug>/complete.mp4
```

compose-final.sh가 자동으로:
1. 인트로→본편: xfade 크로스페이드 (1초)
2. 음성 끝나는 시점 자동 감지 (silencedetect)
3. 본편→아웃트로: fade-out/fade-in (0.5초, 워터마크 노출 0%)
4. 모든 파일 규격 통일 (24fps, 48000Hz)

⚠️ compose-final.sh를 직접 실행할 것 — ffmpeg 명령을 자체 생성하지 마라.

---

## 8. YouTube 가이드 + Threads 발행

### 자동 모드
```bash
npm run publish:channels <slug>
# → output/<slug>/youtube-upload-guide.txt 자동 생성
# → Threads 자동 발행
# → DB 저장 + Telegram 보고
```

### 수동 모드 (--skip-threads)
이미 Threads에 발행된 brief면 중복 방지를 위해 가이드 TXT만 생성:
```bash
npm run publish:channels <slug> --dry-run
# → youtube-upload-guide.txt 생성 (발행 안 함)
```

---

## 8-2. YouTube 맞춤 Description 생성 (Gemini)

`publish:channels`가 생성하는 기본 guide.txt는 본문 복붙 수준이라 YouTube SEO에 부적합하다.
Gemini API로 Brief 본문을 YouTube 최적 Description으로 재작성한다.

```
입력: Brief 제목 + 요약 + 본문 + 태그
출력: youtube-upload-guide.txt 덮어쓰기
```

### Gemini 프롬프트 (그대로 사용할 것)

```
You are a YouTube SEO expert. Given this AI tech brief, write a YouTube video description.

Rules:
- 3 paragraphs: hook (1-2 sentences), key points (3-4 bullet points), call to action
- Include these links at the end:
  📄 Full Article: https://vibehub.com/brief/{slug}
  🧵 Threads: https://www.threads.net/@vibehub1030
  🌐 Website: https://vibehub.com
- Add 8-12 relevant hashtags (no duplicates)
- Add comma-separated tags line for YouTube Studio
- Keep under 5000 characters
- English only

Brief title: {title}
Brief summary: {summary}
Brief body: {body}
Tags: {tags}
```

### 실행

```bash
# Gemini API 호출 (GEMINI_API_KEY 필요)
# 결과를 youtube-upload-guide.txt에 저장
```

⚠️ `GEMINI_API_KEY`가 없으면 이 단계를 skip — 기본 template guide 유지.

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
✅ Avatar: 2760 frames (5m render)
✅ Compose: final.mp4 (5.8MB)
✅ Threads: published
✅ YouTube guide: ready

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

**한 단계 실패가 전체를 중단시키지 않는다** — 가능한 단계까지 진행 후 결과 보고.

---

## 11. 행동 원칙

- `published` 상태 brief만 대상 — draft/review는 절대 건드리지 않음
- 동일 brief 중복 미디어 생성 방지: `output/<slug>/final.mp4`가 이미 존재하면 skip
- 아바타 이미지는 사전에 `output/<slug>/avartar.png`에 준비되어 있어야 함
- 아바타 없으면 자막만 burn-in으로 대체 (graceful degradation)
- 렌더 시간 예상: 2분 영상 기준 ~5분 (Apple Silicon MPS)

---

## 12. 중간 파일 자동 정리

7일 이상 된 output 폴더의 중간 파일(avatar MOV, WAV, intro/outro 등)을 자동 삭제한다.
`complete.mp4`, `subtitles-en.srt`, `youtube-upload-guide.txt`, `avatar-meta.json`만 보관.

```bash
bash tools/cleanup-media.sh --days 7
```

이 단계는 미디어 발행 완료 후 매일 자동 실행된다.
`--dry-run`으로 삭제 대상 미리 확인 가능.
