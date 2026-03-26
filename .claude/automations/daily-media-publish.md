# VibeHub 일일 미디어 발행

## 목적

`daily-auto-publish`에서 새로 `published` 전환된 Brief에 대해 미디어 파이프라인을 실행한다.
NotebookLM 비디오 생성 → 다운로드 → 자막 생성 → 토킹 아바타 렌더 → 최종 합성 → YouTube 가이드 생성.

이 프롬프트는 `daily-auto-publish.md` 실행 이후 스케줄러에서 자동 실행된다.

---

## 실행 순서

```
daily-pipeline → daily-editorial-review → daily-drift-guard → daily-auto-publish
  └→ daily-media-publish (이것)
      1. NotebookLM 비디오 생성 (nlm CLI)
      2. 다운로드 (Claude in Chrome)
      3. Whisper STT 자막
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

`daily-auto-publish`에서 새로 `published`된 brief slug를 대상으로 한다.
또는 수동 지정: `npm run publish:channels <slug>` 결과에서 성공한 slug.

대상이 0건이면 "미디어 발행 대상 없음"으로 종료.

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
4. `~/Downloads/`에서 파일 확인
5. `output/<slug>/video.mp4`로 이동

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

---

## 6. Talking Head 아바타 렌더

### 확정 설정
- 모델: `separable_float` (MPS ~10fps)
- FPS: 24
- 아바타: `output/<slug>/avartar.png` (전신 이미지 필수)
- 비율: 512x512 투명 패딩 (원본 비율 유지)

```bash
~/talking-head-anime-3-demo/venv/bin/python \
  tools/talking-head-render.py \
  output/<slug>/avartar.png \
  output/<slug>/audio-full.wav \
  output/<slug>/avatar.mp4 \
  --fps 24 --model separable_float
```

⚠️ 아바타 이미지가 없으면 이 단계를 skip한다.
⚠️ 전신 이미지만 사용 — 클로즈업은 입 변형이 안 됨.

---

## 7. ffmpeg 최종 합성

### 확정 레이아웃
- 아바타: 500px, 위치 `W-350:H-275` (우하단)
- 자막: 하단 중앙 (Alignment=2, FontSize=20)

```bash
/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg -y \
  -i output/<slug>/video.mp4 \
  -i output/<slug>/avatar-alpha.mov \
  -filter_complex " \
    [1:v]scale=500:-1[avatar]; \
    [0:v][avatar]overlay=W-350:H-275:shortest=1[vid]; \
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

## 8. YouTube 가이드 + Threads 발행

```bash
npm run publish:channels <slug>
# → output/<slug>/youtube-upload-guide.txt 자동 생성
# → Threads 자동 발행
# → DB 저장 + Telegram 보고
```

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
