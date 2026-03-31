# Decision Log

이 문서는 현재 진행 중(pending)인 결정만 관리한다.
완료된 결정은 `docs/archive/decisions-resolved.md`에 보관.

## Pending

### 2026-03-27 — Newsletter 페이지 Brief 미리보기 추가
- 상태: pending
- 배경: 뉴스레터 페이지에 폼만 있어 "구독하면 뭘 받는지" 알 수 없음
- 결정: 최신 published Brief 3개를 미리보기 카드로 표시, 서버 컴포넌트에서 fetch
- 영향: 기존 `listBriefs` API 재활용, 추가 엔드포인트 불필요
