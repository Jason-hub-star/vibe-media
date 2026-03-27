#!/usr/bin/env bash
# 미디어 출력물 정리 — 오래된 중간 파일 자동 삭제
#
# 보관: complete.mp4, subtitles-en.srt, youtube-upload-guide.txt, avatar-meta.json
# 삭제: avatar-*-alpha.mov, audio-*.wav, intro.mp4, outro.mp4, final.mp4, video.mp4, brief-body.txt
#
# Usage: bash tools/cleanup-media.sh [--days 7] [--dry-run]

set -euo pipefail

DAYS="${DAYS:-7}"
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --days) shift; DAYS="$1"; shift ;;
    --dry-run) DRY_RUN=true ;;
  esac
done

echo "=== Media Cleanup (${DAYS}일 이상) ==="

TOTAL_FREED=0

for slug_dir in output/*/; do
  [ -d "$slug_dir" ] || continue

  # complete.mp4가 없으면 아직 파이프라인 진행 중 → skip
  [ -f "${slug_dir}complete.mp4" ] || continue

  # complete.mp4가 N일 이상 됐는지 확인
  if [ "$(find "${slug_dir}complete.mp4" -mtime +${DAYS} 2>/dev/null)" = "" ]; then
    continue
  fi

  slug=$(basename "$slug_dir")
  echo ""
  echo "📁 ${slug}"

  # 삭제 대상
  for pattern in "avatar-*-alpha.mov" "audio-*.wav" "intro.mp4" "outro.mp4" "final.mp4" "video.mp4" "brief-body.txt" "*.png"; do
    for f in ${slug_dir}${pattern}; do
      [ -f "$f" ] || continue
      size=$(ls -lh "$f" | awk '{print $5}')
      if [ "$DRY_RUN" = true ]; then
        echo "  [DRY] rm $f ($size)"
      else
        rm "$f"
        echo "  ✅ rm $f ($size)"
      fi
    done
  done
done

echo ""
echo "=== Done ==="
echo "보관됨: complete.mp4, subtitles-en.srt, youtube-upload-guide.txt, avatar-meta.json"
