CSS 디자인 토큰 준수 검사를 실행합니다.

## 수행 순서

### 1. 변경된 CSS 파일 파악
- `git diff --name-only HEAD` 또는 `git diff --name-only --cached`로 변경된 CSS 파일 목록 추출
- CSS 파일이 없으면 전체 `apps/web/app/*.css` 대상

### 2. 토큰 린트 실행
- 변경된 CSS 파일에 대해 `bash tools/token-lint.sh <files>` 실행
- 인자가 없으면 전체 CSS 파일 대상

### 3. 결과 보고
- 위반 0건이면 PASS 표시
- 1건 이상이면 구조화된 테이블 출력:

```
| Location | Rule | Violation | Suggestion |
```

## 검사 규칙
1. **color-literal**: `rgba(숫자` without `var(--` (예외: 0,0,0 / 255,255,255)
2. **hex-literal**: `#[0-9a-fA-F]{3,8}` 하드코딩
3. **font-size**: 고정 rem/px without `var(--type-*)`
4. **border-radius**: 고정 px without `var(--radius-*)` (예외: 999px/50%)
