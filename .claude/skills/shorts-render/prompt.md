# Shorts + Longform Render — Brief → YouTube 영상 자동 생성

Brief slug를 받아서 Shorts(9:16) + Longform(16:9) 풀 파이프라인을 실행한다.
같은 엔진(BriefShort V3)을 해상도만 바꿔서 공유한다.

## 검증된 E2E 파이프라인 (2026-03-30, V3 Final)

```
Brief (Supabase)
  → Gemini 스크립트 (Shorts: 120-140단어/52초, Longform: 300-350단어/2분)
    → MimikaStudio Qwen3-TTS 1.7B 클론 (owner-jason, WAV)
      → Whisper STT word-level 자막 (JSON)
        → Pexels 키워드 기반 배경 이미지 (portrait/landscape)
          → 문장 경계 기반 씬 자동분할
            → Remotion BriefShort V3 (TransitionSeries 크로스페이드)
              → ffmpeg 합성 (음성 + BGM 랜덤 + loudnorm)
                → YouTube 업로드
```

## 인자

- `<slug>`: Brief slug (필수)
- `--shorts-only`: Shorts만 생성
- `--longform-only`: Longform만 생성
- `--dry-run`: 렌더만 하고 업로드 스킵

## 사전 조건

- MimikaStudio 서버 실행 중 (`mimikactl backend start`, localhost:7693)
- `.env.local`에 `GEMINI_API_KEY`, `PEXELS_API_KEY` 설정

## Steps

### 1. Brief 조회

Supabase MCP 또는 `listSupabaseBriefs()`로 slug 기반 조회.
필요 필드: title, summary, body

### 2. 스크립트 생성

```
Gemini 2.0 Flash API
- Shorts: 120-140 단어 (50-55초), 3초 훅 + 핵심 + CTA
- Longform: 300-350 단어 (2분), 도입 + 본론(3-4 섹션) + 결론 + CTA
- 끝: "Follow VibeHub for daily AI briefs"
```

### 3. MimikaStudio TTS (1.7B)

```bash
curl -X POST http://localhost:7693/api/qwen3/generate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "<script>",
    "mode": "clone",
    "voice_name": "owner-jason",
    "language": "English",
    "speed": 1.0,
    "model_size": "1.7B",
    "model_quantization": "bf16"
  }'
```

**필수:** `model_size: "1.7B"` (0.6B 대비 음질 현저히 향상)

서버 미기동 시: `mimikactl backend start`
모델 미다운로드 시: `huggingface_hub.snapshot_download('mlx-community/Qwen3-TTS-12Hz-1.7B-Base-bf16')`

### 4. Whisper 워드 자막

```python
import whisper
model = whisper.load_model("tiny")
result = model.transcribe(wav_path, word_timestamps=True, language="en")
# → [{ "text": "word", "startFrame": N, "endFrame": N }, ...]
```

### 5. Pexels 키워드 배경 이미지

```bash
# Brief title에서 키워드 2-3개 추출 → Pexels 검색
curl -s "https://api.pexels.com/v1/search?query=<keyword>&per_page=1&orientation=portrait" \
  -H "Authorization: $PEXELS_API_KEY"
```

- Shorts: `orientation=portrait`, 4장
- Longform: `orientation=landscape`, 8장
- 키워드별 1장씩 검색 → 내용에 맞는 이미지 매칭

### 6. 문장 경계 기반 씬 분할

```python
# 마침표/물음표/느낌표 기준으로 문장 끝 감지
# Shorts: 4개 씬, Longform: 8개 씬
# 각 씬의 startFrame/endFrame을 문장 경계에 맞춤
```

균등 분할 아님! 문장이 끊기는 지점에서 씬 전환.

### 7. Remotion 렌더링

**V3 비주얼 스펙:**

| 레이어 | 컴포넌트 | 설명 |
|--------|----------|------|
| L1 | `SceneTransitionLayer` | TransitionSeries + fade 15f 크로스페이드 |
| L2 | `ChapterCard` | 롱폼 전용: 씬마다 챕터 제목 0.5초 |
| L3 | `ProgressBar` | 8px, 오렌지→금색 그라데이션 |
| L4 | `BrandWatermark` | 9:16: 좌상단 / 16:9: 우하단 |
| L5 | `TitleCard` | 첫 1.5초, spring + UPPERCASE |
| L6 | `WordByWordCaptions` | Montserrat 900 72px UPPERCASE, 금색 배경 박스, 4단어 phrase |
| L7 | `CtaEnding` | 마지막 2.5초, pulse 효과 |

**자막 바이럴 스타일:**
- Font: Montserrat Black 72px UPPERCASE
- Stroke: `-webkit-text-stroke: 2px black`
- Shadow: `0 0 12px rgba(0,0,0,0.9)`
- Active word: 금색(#FFD700) 배경 + 검정 텍스트 + padding + borderRadius
- 위치: 9:16 = top 45% (중앙), 16:9 = bottom 18%
- 한 번에 4단어 (phrase 단위)

**렌더 명령:**
```bash
cd packages/media-engine
npx remotion render src/remotion/index.tsx BriefShort /tmp/shorts-visual.mp4 \
  --codec=h264 --props=/tmp/props.json --frames=0-<N> --concurrency=3
```

- Shorts: `BriefShort` (1080×1920)
- Longform: `BriefLongform` (1920×1080)
- 이미지는 **base64 data URI**로 props에 인라인 (CORS 회피)

### 8. BGM 랜덤 선택 + 오디오 합성

```bash
# BGM 랜덤 선택
BGM=$(ls assets/bgm/*.mp3 | shuf -n 1)

# 합성
ffmpeg -y \
  -i visual.mp4 \
  -i voice.wav \
  -i "$BGM" \
  -map 0:v \
  -filter_complex "[1:a]loudnorm=I=-16:TP=-1.5[voice];[2:a]volume=0.25,afade=t=out:st=<end-3>:d=3[bgm];[voice][bgm]amix=inputs=2:duration=shortest[aout]" \
  -map "[aout]" \
  -c:v copy -c:a aac -b:a 192k -shortest \
  output.mp4
```

**필수:**
- `-map 0:v -map 1:a` (Remotion 무음 트랙 무시)
- BGM `volume=0.25` (나레이션 대비 배경 레벨)
- BGM fade-out: 영상 끝 3초 전부터

**BGM 라이브러리 (10곡):** `assets/bgm/`
| 파일 | 분위기 | 어울리는 주제 |
|------|--------|-------------|
| 01-calm-ambient | 차분 | 일반 뉴스, 분석 |
| 02-dark-pulse | 어두움 | 보안, 해킹, 위협 |
| 03-warm-pad | 따뜻함 | 긍정적 발표, 성과 |
| 04-tension-build | 긴장 | 경쟁, 갈등, 논쟁 |
| 05-bright-tech | 밝음 | 신제품 출시, 혁신 |
| 06-deep-bass | 깊음 | 인프라, 대규모 시스템 |
| 07-ethereal | 몽환 | AI, 미래, 비전 |
| 08-urgent | 긴급 | 속보, 긴급 업데이트 |
| 09-dreamy | 부드러움 | 연구, 학술, 장기 전망 |
| 10-cinematic | 장엄 | 대형 발표, 역사적 사건 |

### 9. YouTube 자동 업로드 (`publish:channels` 통합)

영상 생성 후 `publish:channels`를 실행하면 자동으로 처리된다:

```bash
npm run publish:channels <slug>
```

- `shorts.mp4` → YouTube Shorts (unlisted, #Shorts 태그)
- `longform.mp4` → YouTube Longform (unlisted)
- `final.mp4` → 레거시 fallback
- API 업로드 성공 시 `brief_posts.youtube_video_id` 자동 연결
- `YOUTUBE_CLIENT_ID/SECRET/REFRESH_TOKEN` 미설정 시 → 로컬 메타데이터만 저장

운영자는 YouTube Studio에서 unlisted → public 전환만 하면 된다.

## 알려진 문제 + 해결 패턴

| 문제 | 해결 |
|------|------|
| Remotion public-dir 404 | base64 data URI로 이미지 인라인 |
| Remotion 무음 오디오 트랙 | ffmpeg `-map 0:v -map 1:a` |
| Sequence 내 프레임 계산 | useCurrentFrame()은 이미 로컬 |
| Gemini 429 rate limit | 10초 대기 후 재시도 |
| MimikaStudio 모델 미설치 | `snapshot_download('mlx-community/Qwen3-TTS-12Hz-1.7B-Base-bf16')` |
| mlx-audio 미설치 | `pip install -U mlx-audio` |
| Pexels 이미지 다운로드 실패 | 다른 키워드로 재시도, bg 크기 29B면 실패 |
| BGM 안 들림 | 볼륨 -20dB 이상 확인, 합성 시 volume=0.25 |

## 출력물

```
output/<slug>/
├── shorts-script.txt       # Shorts 스크립트
├── shorts-voice.wav        # 1.7B 클론 음성
├── shorts-words.json       # 워드 타임스탬프
├── shorts.mp4              # 최종 Shorts (9:16, ~47초)
├── longform-script.txt     # Longform 스크립트
├── longform-voice.wav      # 1.7B 클론 음성
├── longform-words.json     # 워드 타임스탬프
├── longform.mp4            # 최종 Longform (16:9, ~2분)
└── render-meta.json        # BGM 선택, 렌더 시간 등
```

## NotebookLM 관계

NotebookLM(17분 팟캐스트)은 **이 파이프라인에서 사용하지 않음**.
MimikaStudio Qwen3-TTS 1.7B가 Shorts + Longform 둘 다 커버.
기존 NotebookLM 코드는 동결(삭제 X) — 팟캐스트 포맷 재개 시 사용 가능.

## 관련 파일

- `packages/media-engine/src/remotion/BriefShort.tsx` — V3 Composition (Shorts + Longform 공유)
- `packages/media-engine/src/remotion/index.tsx` — BriefShort + BriefLongform + BriefAudiogram 등록
- `assets/bgm/` — BGM 라이브러리 10곡
- `.claude/automations/daily-media-publish.md` — 자동화 프롬프트
