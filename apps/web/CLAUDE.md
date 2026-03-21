# apps/web Rules

- 공개 사이트와 admin UI를 한 앱에서 관리한다.
- `video`는 public route로 만들지 않는다.
- 컴포넌트는 300줄 전 분리 검토한다.
- 모든 페이지는 loading/empty/error 상태를 고려하고, 아직 미구현이면 문서에 남긴다.
- 이미지 영역은 명시적 placeholder asset과 연결한다.
- Stitch 시안은 참고용이며 최종 구현 기준은 이 레포의 토큰과 컴포넌트다.
- `app/(public)`와 `app/admin`의 IA를 섞지 않는다.
- 현재 `admin` 진입은 로컬 스캐폴드용 gate이며 실제 인증으로 취급하지 않는다.
- 이 워크스페이스에서는 `npm run test`와 `npm run test:e2e`를 바로 사용할 수 있어야 한다.
