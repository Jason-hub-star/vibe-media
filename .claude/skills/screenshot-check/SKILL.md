---
name: screenshot-check
description: Playwright로 public 페이지 스크린샷을 찍고 내부 용어 노출, 깨진 UI를 검증한다. 프론트엔드 변경 후 시각 확인이 필요할 때 사용.
argument-hint: [page-filter]
---

# Screenshot Check

Playwright를 이용해 public 페이지의 스크린샷을 찍고 검증한다.

## Steps

1. 스크린샷 테스트를 실행한다:
```bash
npx playwright test apps/web/tests/e2e/public-ux-screenshots.spec.ts $ARGUMENTS
```

2. `test-results/screenshot-*.png` 파일들을 Read 도구로 열어 시각 확인한다.

3. 확인할 항목:
   - 내부 용어 노출 여부 (Operator, cockpit, pipeline, stitch 등)
   - raw status 값 노출 여부 (draft, review, tracked 등)
   - 날짜 포맷이 ISO 원본이 아닌 YYYY-MM-DD인지
   - Admin 링크가 public nav에 없는지
   - 한글 copy가 의도대로 표시되는지

4. 문제가 발견되면 해당 파일과 위치를 보고한다.
