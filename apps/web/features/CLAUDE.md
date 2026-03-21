# features Rules

- 각 도메인은 `api / use-case / presenter / view`를 유지한다.
- basename은 backend 대응 파일과 맞춘다.
- presenter는 문자열/표시 규칙만, api는 데이터 접근만 담당한다.
- 새 discovery 계열 도메인은 public/admin에서 재사용 가능하도록 view를 과하게 route 종속적으로 만들지 않는다.
