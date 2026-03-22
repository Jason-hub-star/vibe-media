#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$HOME/.local/bin:$PATH"

# Keep the Mac awake while the router is running.
# This prevents idle sleep on AC power, but does not override lid-close sleep.
exec caffeinate -i -m -s "${ROOT_DIR}/bin/start-router.sh"
