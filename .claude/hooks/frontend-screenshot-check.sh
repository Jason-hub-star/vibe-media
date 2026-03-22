#!/bin/bash
# PostToolUse hook: 프론트엔드 파일 편집 후 Playwright 스크린샷 테스트 자동 실행
# apps/web 내 .tsx, .ts, .css 파일 변경 시에만 동작

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.file_path // empty')

# apps/web 프론트엔드 파일만 필터
if [[ "$FILE_PATH" =~ ^.*/apps/web/(app|features|components)/.*(\.tsx?|\.css)$ ]]; then
  cd /Users/family/jason/vibehub-media
  npx playwright test apps/web/tests/e2e/public-ux-screenshots.spec.ts --reporter=line 2>&1 | tail -5 >&2
fi

exit 0
