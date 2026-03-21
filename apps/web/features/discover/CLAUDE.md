# discover feature Rules

- `radar`는 공개 디스커버리 허브이고, `admin/discover`는 큐레이션 운영 화면이다.
- basename은 backend의 `list-discover-items.ts`와 맞춘다.
- 카드에는 항상 빠른 이동 action을 남기고, 다운로드/공식문서/깃허브를 섞어도 된다.
- 카테고리 확장은 enum 추가와 presenter 수정으로 처리하고, route를 쪼개지 않는다.
