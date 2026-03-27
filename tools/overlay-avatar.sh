#!/usr/bin/env bash
# 아바타 overlay — avatar-meta.json을 읽어서 모드별 자동 합성
#
# Usage: bash tools/overlay-avatar.sh <slug>
# 입력: output/<slug>/video.mp4 + avatar-meta.json + avatar-*-alpha.mov
# 출력: output/<slug>/final.mp4

set -euo pipefail

FFMPEG="/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg"
SLUG="${1:?Usage: bash tools/overlay-avatar.sh <slug>}"
OUT="output/${SLUG}"

# 설정값 (수정 금지 — 2026-03-27 검증 완료)
AVATAR_SCALE="${AVATAR_SCALE:-500}"
CRF="${CRF:-20}"
FPS="${FPS:-24}"
SAMPLE_RATE="${SAMPLE_RATE:-48000}"

# 파일 확인
[ -f "${OUT}/video.mp4" ] || { echo "❌ Missing: ${OUT}/video.mp4"; exit 1; }
[ -f "${OUT}/subtitles-en.srt" ] || { echo "⚠️ No subtitles, proceeding without"; }

# avatar-meta.json 읽기
if [ -f "${OUT}/avatar-meta.json" ]; then
  MODE=$(python3 -c "import json; print(json.load(open('${OUT}/avatar-meta.json'))['mode'])")
else
  MODE="none"
fi

echo "=== Avatar Overlay ==="
echo "Slug: ${SLUG} | Mode: ${MODE}"

# 자막 경로 (ffmpeg subtitles 필터용 — 절대경로)
SRT_ABS="$(cd "${OUT}" && pwd)/subtitles-en.srt"
SUB_FILTER=""
if [ -f "${OUT}/subtitles-en.srt" ]; then
  SUB_FILTER="subtitles=${SRT_ABS}:force_style='FontSize=20,FontName=Arial,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Shadow=1,MarginV=20,Alignment=2'"
fi

case "$MODE" in

  male_solo)
    echo "Single male avatar (W-350:H-275)"
    $FFMPEG -y \
      -i "${OUT}/video.mp4" \
      -i "${OUT}/avatar-male-alpha.mov" \
      -filter_complex " \
        [1:v]scale=${AVATAR_SCALE}:-1[avatar]; \
        [0:v][avatar]overlay=W-350:H-275:shortest=1[vid]; \
        [vid]${SUB_FILTER}[out]" \
      -map "[out]" -map 0:a \
      -c:v libx264 -crf "$CRF" -preset fast -c:a copy -shortest \
      "${OUT}/final.mp4" 2>/dev/null
    ;;

  female_solo)
    echo "Single female avatar (W-350:H-275)"
    $FFMPEG -y \
      -i "${OUT}/video.mp4" \
      -i "${OUT}/avatar-female-alpha.mov" \
      -filter_complex " \
        [1:v]scale=${AVATAR_SCALE}:-1[avatar]; \
        [0:v][avatar]overlay=W-350:H-275:shortest=1[vid]; \
        [vid]${SUB_FILTER}[out]" \
      -map "[out]" -map 0:a \
      -c:v libx264 -crf "$CRF" -preset fast -c:a copy -shortest \
      "${OUT}/final.mp4" 2>/dev/null
    ;;

  dual)
    echo "Dual avatars — male(left) + female(right)"
    # 남자: 좌하단 (overlay=0:H-275)
    # 여자: 우하단 (overlay=W-350:H-275)
    $FFMPEG -y \
      -i "${OUT}/video.mp4" \
      -i "${OUT}/avatar-male-alpha.mov" \
      -i "${OUT}/avatar-female-alpha.mov" \
      -filter_complex " \
        [1:v]scale=${AVATAR_SCALE}:-1[male]; \
        [2:v]scale=${AVATAR_SCALE}:-1[female]; \
        [0:v][male]overlay=0:H-275:shortest=1[tmp]; \
        [tmp][female]overlay=W-350:H-275:shortest=1[vid]; \
        [vid]${SUB_FILTER}[out]" \
      -map "[out]" -map 0:a \
      -c:v libx264 -crf "$CRF" -preset fast -c:a copy -shortest \
      "${OUT}/final.mp4" 2>/dev/null
    ;;

  *)
    echo "No avatar — subtitles only"
    if [ -n "$SUB_FILTER" ]; then
      $FFMPEG -y \
        -i "${OUT}/video.mp4" \
        -vf "${SUB_FILTER}" \
        -c:v libx264 -crf "$CRF" -preset fast -c:a copy \
        "${OUT}/final.mp4" 2>/dev/null
    else
      cp "${OUT}/video.mp4" "${OUT}/final.mp4"
    fi
    ;;

esac

ls -lh "${OUT}/final.mp4"
echo "✅ ${OUT}/final.mp4"
