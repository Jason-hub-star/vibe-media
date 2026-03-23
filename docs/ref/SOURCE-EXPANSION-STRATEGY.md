# Source Registry 확장 전략

## 1. 즉시 추가 가능 (RSS/API)

| Source | 방식 | 기대 건수 | 우선순위 |
|--------|------|----------|----------|
| arXiv cs.AI/cs.CL/cs.LG | Atom API | 일 50~100건 | P1 |
| Hacker News Top | Firebase API | 일 30건 AI 필터 | P1 |
| Reddit r/MachineLearning | Reddit API | 일 20건 | P2 |
| Product Hunt AI 카테고리 | GraphQL API | 일 5~10건 | P2 |
| Hugging Face Daily Papers | RSS (커뮤니티) | 일 5~10건 | P1 |

## 2. 중기 추가 (크롤링/파싱)

| Source | 방식 | 기대 건수 |
|--------|------|----------|
| GitHub Trending (AI repos) | GH Archive + star velocity | 주 10건 |
| 机器之心 (Synced) | RSS or scrape | 일 5건 |
| 量子位 (QbitAI) | WeChat/웹 | 일 5건 |

## 3. Defuddle 통합 계획

- Phase 1 구현 완료:
  - RSS `article` source에 대해 item URL 후속 fetch 수행
  - `Defuddle`로 markdown 추출 시도
  - 결과를 `contentMarkdown`, `parserName`, `parseStatus`로 snapshot `parsed_content`에 저장
- 현재 범위:
  - `contentType === article` RSS source만 대상
  - 실패 시 기존 `parsedSummary` fallback 유지
  - GitHub releases, disabled source, PDF/doc source는 제외
- 다음 단계:
  - classifier/draft 품질 규칙에서 `contentMarkdown` 활용 비중 확대
  - site-specific extractor 활용 (GitHub issues, Reddit threads, YouTube 등)

## 4. Autoresearch 패턴 적용

- Karpathy autoresearch의 핵심: **고정 시간 실험 → 메트릭 비교 → keep/discard**
- VibeHub 적용: editorial policy를 코드로 관리하고, shadow trial로 A/B 테스트
- 이미 classifier/brief/discover shadow trial 프레임워크가 있음 → 이를 source 선택에도 확장

## 5. 경쟁사 분석 요약 (reference)

Brief overview of competitive landscape in AI news aggregation space.

## 6. 통합 로드맵

Phase 1 (즉시): P1 sources RSS/API
Phase 2 (1-2주): P2 sources + `contentMarkdown` 활용 확대 + `trial:all` 후속 운영화
Phase 3 (중기): 크롤링 sources + autoresearch loop
