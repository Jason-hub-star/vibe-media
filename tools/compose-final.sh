#!/usr/bin/env bash
# VibeHub 최종 영상 합성 — 본편 + 아웃트로
#
# 본편 → 아웃트로: 음성 끝 시점에서 fade-out → fade-in (워터마크 노출 0%)
#
# 음성 끝나는 시점은 silencedetect로 자동 감지.
# 모든 값은 동적 계산 — 하드코딩 없음.
#
# Usage: bash tools/compose-final.sh <slug>
# 필요 파일: output/<slug>/final.mp4, outro.mp4

set -euo pipefail

FFMPEG="/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg"
SLUG="${1:?Usage: bash tools/compose-final.sh <slug>}"
OUT="output/${SLUG}"

# 설정값 (환경변수로 오버라이드 가능)
FADE_DUR="${FADE_DUR:-0.5}"                     # 본편→아웃트로 페이드 (초)
SILENCE_NOISE="${SILENCE_NOISE:--30dB}"         # 무음 감지 임계값
SILENCE_MIN_DUR="${SILENCE_MIN_DUR:-1.5}"       # 무음 최소 길이 (초)
CRF="${CRF:-20}"                                 # 영상 품질
FPS="${FPS:-24}"                                  # 프레임레이트
SAMPLE_RATE="${SAMPLE_RATE:-48000}"              # 오디오 샘플레이트

echo "=== VibeHub Video Composer ==="
echo "Slug: ${SLUG}"

# 파일 확인
for f in final.mp4 outro.mp4; do
  [ -f "${OUT}/${f}" ] || { echo "❌ Missing: ${OUT}/${f}"; exit 1; }
done

# 1. 규격 통일
echo "Normalizing..."
for f in final outro; do
  $FFMPEG -y -i "${OUT}/${f}.mp4" \
    -c:v libx264 -crf "$CRF" -r "$FPS" -ar "$SAMPLE_RATE" -ac 2 -pix_fmt yuv420p \
    "/tmp/vhc_${f}.mp4" 2>/dev/null
done

# 2. 음성 끝나는 시점 자동 감지
SILENCE_OUTPUT=$($FFMPEG -i "/tmp/vhc_final.mp4" \
  -af "silencedetect=noise=${SILENCE_NOISE}:d=${SILENCE_MIN_DUR}" -f null - 2>&1)

MAIN_DUR=$(ffprobe -v quiet -show_format "/tmp/vhc_final.mp4" 2>&1 | grep duration | cut -d= -f2)

# 마지막 silence_end 추출 — 영상 끝에서 5초 이내인 경우만 유효로 판단
LAST_SILENCE_END=$(echo "$SILENCE_OUTPUT" | grep "silence_end" | tail -1 \
  | sed 's/.*silence_end: //' | cut -d'|' -f1 | tr -d ' ' || echo "")
LAST_SILENCE_START=$(echo "$SILENCE_OUTPUT" | grep "silence_start" | tail -1 \
  | sed 's/.*silence_start: //' | head -1 || echo "")

SILENCE_START=""
if [ -n "$LAST_SILENCE_END" ] && [ -n "$LAST_SILENCE_START" ]; then
  DIST=$(echo "$MAIN_DUR - $LAST_SILENCE_END" | bc)
  # silence_end가 영상 끝에서 5초 이내여야 "말이 끝난 것"으로 판단
  IS_NEAR=$(echo "$DIST < 5" | bc)
  if [ "$IS_NEAR" -eq 1 ]; then
    SILENCE_START="$LAST_SILENCE_START"
    echo "✅ Speech ends at: ${SILENCE_START}s (silence_end: ${LAST_SILENCE_END}s)"
  else
    echo "⚠️ Last silence_end(${LAST_SILENCE_END}s) is ${DIST}s before end — speech continues to end"
  fi
fi

if [ -z "$SILENCE_START" ]; then
  # 음성이 끝까지 이어지면 전체 재생 후 아웃트로 붙임
  SILENCE_START="$MAIN_DUR"
  echo "⚠️ No end-of-speech silence detected, using full duration: ${SILENCE_START}s"
fi

echo "Main: ${MAIN_DUR}s"

# 3. 본편 자르기 + fade-out
CUT_POINT="$SILENCE_START"
FADE_START=$(echo "$CUT_POINT - $FADE_DUR" | bc)
echo "Cut at ${CUT_POINT}s, fade-out from ${FADE_START}s (${FADE_DUR}s)"

$FFMPEG -y -i /tmp/vhc_final.mp4 -t "$CUT_POINT" \
  -vf "fade=t=out:st=${FADE_START}:d=${FADE_DUR}" \
  -af "afade=t=out:st=${FADE_START}:d=${FADE_DUR}" \
  -c:v libx264 -crf "$CRF" -r "$FPS" -ar "$SAMPLE_RATE" -pix_fmt yuv420p \
  /tmp/vhc_trimmed.mp4 2>/dev/null

# 아웃트로 fade-in
$FFMPEG -y -i /tmp/vhc_outro.mp4 \
  -vf "fade=t=in:st=0:d=${FADE_DUR}" \
  -af "afade=t=in:st=0:d=${FADE_DUR}" \
  -c:v libx264 -crf "$CRF" -r "$FPS" -ar "$SAMPLE_RATE" -pix_fmt yuv420p \
  /tmp/vhc_outro_fade.mp4 2>/dev/null

# concat
printf "file '/tmp/vhc_trimmed.mp4'\nfile '/tmp/vhc_outro_fade.mp4'" > /tmp/vhc_concat.txt
$FFMPEG -y -f concat -safe 0 -i /tmp/vhc_concat.txt -c copy "${OUT}/complete.mp4" 2>/dev/null

# 정리
rm -f /tmp/vhc_*.mp4 /tmp/vhc_concat.txt

# 결과
FINAL_DUR=$(ffprobe -v quiet -show_format "${OUT}/complete.mp4" 2>&1 | grep duration | cut -d= -f2)
SIZE=$(ls -lh "${OUT}/complete.mp4" | awk '{print $5}')
echo ""
echo "═══════════════════════════════════════"
echo "✅ ${OUT}/complete.mp4"
echo "   Duration: ${FINAL_DUR}s | Size: ${SIZE}"
echo "   Main → Outro at speech end(${SILENCE_START}s)"
echo "═══════════════════════════════════════"
