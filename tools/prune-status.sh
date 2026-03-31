#!/bin/bash
# PROJECT-STATUS.md에서 14일 이상 된 "done (YYYY-MM-DD)" 항목을 자동 제거
# 사용법: bash tools/prune-status.sh [--dry-run]

set -euo pipefail

STATUS_FILE="docs/status/PROJECT-STATUS.md"
DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

if [[ ! -f "$STATUS_FILE" ]]; then
  echo "❌ $STATUS_FILE not found"
  exit 1
fi

CUTOFF=$(date -v-14d +%Y-%m-%d 2>/dev/null || date -d '14 days ago' +%Y-%m-%d)
REMOVED=0
KEPT_LINES=()

while IFS= read -r line; do
  # "done (YYYY-MM-DD)" 패턴 매칭
  if [[ "$line" =~ done\ \(([0-9]{4}-[0-9]{2}-[0-9]{2})\) ]]; then
    ITEM_DATE="${BASH_REMATCH[1]}"
    if [[ "$ITEM_DATE" < "$CUTOFF" ]]; then
      ((REMOVED++))
      if $DRY_RUN; then
        echo "🗑  PRUNE: $line"
      fi
      continue
    fi
  fi
  KEPT_LINES+=("$line")
done < "$STATUS_FILE"

if [[ $REMOVED -eq 0 ]]; then
  echo "✅ No items older than 14 days to prune"
  exit 0
fi

if $DRY_RUN; then
  echo ""
  echo "📊 Would remove $REMOVED items (older than $CUTOFF)"
  echo "   Run without --dry-run to apply"
else
  printf '%s\n' "${KEPT_LINES[@]}" > "$STATUS_FILE"
  echo "✅ Pruned $REMOVED items older than $CUTOFF from $STATUS_FILE"
fi
