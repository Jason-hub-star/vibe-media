#!/bin/zsh
set -euo pipefail
export PATH="$HOME/.local/bin:$PATH"

if [[ $# -lt 1 ]]; then
  echo "Usage: run-claude.sh <prompt>" >&2
  exit 2
fi

if ! command -v claude >/dev/null 2>&1; then
  echo "Claude Code CLI is not installed." >&2
  exit 1
fi

WORKDIR="${ROUTER_WORKDIR:-$PWD}"
PROMPT="$1"
CLAUDE_MODEL="${ROUTER_CLAUDE_MODEL:-claude-sonnet-4-6}"

exec claude -p "$PROMPT" \
  --model "$CLAUDE_MODEL" \
  --output-format text \
  --permission-mode auto \
  --add-dir "$WORKDIR"
