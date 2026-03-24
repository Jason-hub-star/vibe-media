#!/usr/bin/env bash
# CSS Design Token Lint — checks that CSS files use design-token custom properties
# instead of hard-coded colors, font-sizes, and border-radius values.
#
# Usage: bash tools/token-lint.sh [file ...]
# Default target: apps/web/app/*.css

set -euo pipefail

# ── Targets ──────────────────────────────────────────────────────────────────
if [ $# -gt 0 ]; then
  FILES=("$@")
else
  FILES=(apps/web/app/*.css)
fi

VIOLATIONS=0
OUTPUT=""

add_violation() {
  local file="$1" line="$2" rule="$3" snippet="$4" suggestion="$5"
  OUTPUT+="$(printf '%s:%s | %s | %s | %s\n' "$file" "$line" "$rule" "$snippet" "$suggestion")"
  OUTPUT+=$'\n'
  VIOLATIONS=$((VIOLATIONS + 1))
}

# Helper: test with ERE (works on macOS and Linux)
matches() { echo "$1" | grep -qE "$2" 2>/dev/null; }
no_match() { ! echo "$1" | grep -qE "$2" 2>/dev/null; }

for file in "${FILES[@]}"; do
  [ -f "$file" ] || continue
  lineno=0

  while IFS= read -r content || [ -n "$content" ]; do
    lineno=$((lineno + 1))

    # Skip comments
    [[ "$content" =~ ^[[:space:]]*/\* ]] && continue
    [[ "$content" =~ ^[[:space:]]*\* ]] && continue

    # Rule 1: rgba(digits without var(--)  (allow 0,0,0 and 255,255,255)
    if matches "$content" 'rgba?\([[:space:]]*[0-9]' && no_match "$content" 'var\(--'; then
      trimmed="${content#"${content%%[![:space:]]*}"}"
      # Allow pure black/white
      if no_match "$content" 'rgba?\([[:space:]]*0[[:space:]]*,[[:space:]]*0[[:space:]]*,[[:space:]]*0' && \
         no_match "$content" 'rgba?\([[:space:]]*255[[:space:]]*,[[:space:]]*255[[:space:]]*,[[:space:]]*255'; then
        add_violation "$file" "$lineno" "color-literal" "$trimmed" "Use rgba(var(--color-*-rgb), alpha)"
      fi
    fi

    # Rule 2: Hex color literals
    if matches "$content" '#[0-9a-fA-F][0-9a-fA-F][0-9a-fA-F]' && no_match "$content" 'var\(--'; then
      trimmed="${content#"${content%%[![:space:]]*}"}"
      add_violation "$file" "$lineno" "hex-literal" "$trimmed" "Use var(--color-*)"
    fi

    # Rule 3: Fixed font-size without token (allow max/clamp/inherit/var)
    if matches "$content" 'font-size[[:space:]]*:' && \
       no_match "$content" 'var\(--type-' && \
       no_match "$content" '(max|clamp|inherit|unset|initial)'; then
      trimmed="${content#"${content%%[![:space:]]*}"}"
      add_violation "$file" "$lineno" "font-size" "$trimmed" "Use var(--type-*)"
    fi

    # Rule 4: Fixed border-radius without token (allow 999px, 50%, var)
    if matches "$content" 'border-radius[[:space:]]*:' && \
       no_match "$content" 'var\(--radius-' && \
       no_match "$content" '(999px|50%|inherit|unset|initial|calc)'; then
      trimmed="${content#"${content%%[![:space:]]*}"}"
      add_violation "$file" "$lineno" "border-radius" "$trimmed" "Use var(--radius-*) or 999px for pills"
    fi

  done < "$file"
done

# ── Output ───────────────────────────────────────────────────────────────────
if [ "$VIOLATIONS" -eq 0 ]; then
  echo "✅ Token lint: 0 violations"
  exit 0
fi

echo "⚠️  Token lint: $VIOLATIONS violation(s)"
echo ""
printf '%-40s | %-16s | %-50s | %s\n' "Location" "Rule" "Violation" "Suggestion"
printf '%-40s-+-%-16s-+-%-50s-+-%s\n' "$(printf '%0.s-' {1..40})" "$(printf '%0.s-' {1..16})" "$(printf '%0.s-' {1..50})" "$(printf '%0.s-' {1..30})"
echo "$OUTPUT" | while IFS='|' read -r loc rule viol sug; do
  [ -z "$loc" ] && continue
  printf '%-40s | %-16s | %-50s | %s\n' "$loc" "$rule" "$viol" "$sug"
done
exit 1
