# Stitch Workflow

## Rule
- Stitch는 지속 생성 엔진이지만 최종 구현 소스는 아니다.
- 저장 가능한 산출물은 `prompt`, `decision`, `token note`뿐이다.
- 스크린샷과 raw HTML은 비교 후 폐기한다.

## Page Workflow
1. `docs/design/prompts/<page>.md` 작성
2. 3~5 variants 생성
3. 선택/기각 이유를 `docs/design/decisions/<page>.md`에 기록
4. 토큰/패턴 차이를 `docs/design/tokens/<page>.md`에 기록
5. 구현은 `apps/web` 컴포넌트로 수작업 반영

## Claude Handoff Rule
- 홈에서 새 패턴을 만들면 다른 route로 무단 복제하지 말고 문서화 후 반영한다.
- Prompt를 바꾸면 decision 문서도 같이 갱신한다.
- Placeholder slot을 바꾸면 `docs/ref/ASSET-GUIDE.md`도 같이 갱신한다.
