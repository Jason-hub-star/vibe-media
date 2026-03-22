#!/bin/zsh
set -euo pipefail
export PATH="$HOME/.local/bin:$PATH"

if [[ $# -lt 1 ]]; then
  echo "Usage: run-codex.sh <prompt>" >&2
  exit 2
fi

if ! command -v codex >/dev/null 2>&1; then
  echo "Codex CLI is not installed." >&2
  exit 1
fi

WORKDIR="${ROUTER_WORKDIR:-$PWD}"
SANDBOX_MODE="${CODEX_SANDBOX:-read-only}"
PROMPT="$1"
TMP_OUTPUT="$(mktemp)"
TMP_LOG="$(mktemp)"
trap 'rm -f "$TMP_OUTPUT" "$TMP_LOG"' EXIT

if codex -a never exec \
  --skip-git-repo-check \
  --ephemeral \
  --color never \
  -s "$SANDBOX_MODE" \
  -C "$WORKDIR" \
  --output-last-message "$TMP_OUTPUT" \
  "$PROMPT" >"$TMP_LOG" 2>&1; then
  if [[ -s "$TMP_OUTPUT" ]]; then
    cat "$TMP_OUTPUT"
  else
    cat "$TMP_LOG"
  fi
else
  cat "$TMP_LOG" >&2
  exit 1
fi
