export const EVAL_CASES = [
  {
    name: "chat_greeting_short",
    kind: "chat_eval",
    input_text: "안녕",
    expected_json: {
      language: "ko",
      min_length: 2,
      max_length: 120,
      must_not_include: ["```", "As an AI"],
    },
    style_constraints: {
      mode: "chat",
    },
  },
  {
    name: "chat_empathy_support",
    kind: "chat_eval",
    input_text: "오늘 좀 힘들다",
    expected_json: {
      language: "ko",
      min_length: 10,
      max_length: 220,
      must_include_any: ["괜찮", "힘들", "쉬", "천천"],
      must_not_include: ["```", "As an AI"],
    },
    style_constraints: {
      mode: "chat",
    },
  },
  {
    name: "chat_rewrite_natural",
    kind: "chat_eval",
    input_text: "이 문장을 더 자연스럽게 바꿔줘: 오늘 회의는 오후 세시부터 진행 예정입니다.",
    expected_json: {
      language: "ko",
      min_length: 10,
      max_length: 220,
      must_not_include: ["```", "As an AI"],
    },
    style_constraints: {
      mode: "default",
    },
  },
  {
    name: "chat_brainstorm_weekend",
    kind: "chat_eval",
    input_text: "주말에 혼자 할만한 거 추천해줘",
    expected_json: {
      language: "ko",
      min_length: 20,
      max_length: 260,
      must_include_any: ["추천", "해볼", "산책", "영화", "카페"],
      must_not_include: ["```", "As an AI"],
    },
    style_constraints: {
      mode: "chat",
    },
  },
  {
    name: "chat_english_reply",
    kind: "chat_eval",
    input_text: "Can you help me make this sentence shorter?",
    expected_json: {
      language: "en",
      min_length: 10,
      max_length: 180,
      must_not_include: ["```", "As an AI"],
    },
    style_constraints: {
      mode: "chat",
    },
  },
  {
    name: "chat_focus_advice",
    kind: "chat_eval",
    input_text: "집중이 안 되는데 30분만 버티는 방법 알려줘",
    expected_json: {
      language: "ko",
      min_length: 20,
      max_length: 240,
      must_include_any: ["30분", "작게", "잠깐", "집중", "정리"],
      must_not_include: ["```", "As an AI"],
    },
    style_constraints: {
      mode: "chat",
    },
  },
  {
    name: "chat_summary_help",
    kind: "chat_eval",
    input_text: "아래 글을 두 문장으로 요약해줘: 오늘 발표에서는 사용자 피드백을 반영한 새로운 대시보드 구조와 향후 일정 조정안을 설명했다.",
    expected_json: {
      language: "ko",
      min_length: 15,
      max_length: 220,
      must_not_include: ["```", "As an AI"],
    },
    style_constraints: {
      mode: "default",
    },
  },
  {
    name: "chat_simple_planning",
    kind: "chat_eval",
    input_text: "오늘 할 일을 세 개만 간단히 정리해줘",
    expected_json: {
      language: "ko",
      min_length: 15,
      max_length: 220,
      must_include_any: ["1", "첫", "세", "정리"],
      must_not_include: ["```", "As an AI"],
    },
    style_constraints: {
      mode: "default",
    },
  },
  {
    name: "search_news_latest",
    kind: "search_eval",
    input_text: "최근 오픈AI 모델 뭐 나왔어",
    expected_json: {
      need_search: true,
    },
    style_constraints: {},
  },
  {
    name: "search_price_query",
    kind: "search_eval",
    input_text: "오늘 비트코인 가격 얼마야",
    expected_json: {
      need_search: true,
    },
    style_constraints: {},
  },
  {
    name: "search_version_specific",
    kind: "search_eval",
    input_text: "Node 24에서 node:sqlite 안정화됐어?",
    expected_json: {
      need_search: true,
    },
    style_constraints: {},
  },
  {
    name: "search_korean_weather",
    kind: "search_eval",
    input_text: "오늘 서울 날씨 어때",
    expected_json: {
      need_search: true,
    },
    style_constraints: {},
  },
  {
    name: "search_timeless_explanation",
    kind: "search_eval",
    input_text: "정규표현식이 뭔지 쉽게 설명해줘",
    expected_json: {
      need_search: false,
    },
    style_constraints: {},
  },
  {
    name: "search_emotional_support",
    kind: "search_eval",
    input_text: "기분이 우울할 때 어떻게 버텨",
    expected_json: {
      need_search: false,
    },
    style_constraints: {},
  },
  {
    name: "search_creative_brainstorm",
    kind: "search_eval",
    input_text: "새 프로젝트 이름 아이디어 10개 줘",
    expected_json: {
      need_search: false,
    },
    style_constraints: {},
  },
  {
    name: "search_policy_like_question",
    kind: "search_eval",
    input_text: "한국에서 전기요금 누진제 최근 바뀌었어?",
    expected_json: {
      need_search: true,
    },
    style_constraints: {},
  },
  {
    name: "route_local_rewrite",
    kind: "routing_eval",
    input_text: "이 문장을 더 짧고 자연스럽게 바꿔줘",
    expected_json: {
      route: "local",
    },
    style_constraints: {},
  },
  {
    name: "route_local_plan",
    kind: "routing_eval",
    input_text: "오늘 해야 할 일 세 개만 정리해줘",
    expected_json: {
      route: "local",
    },
    style_constraints: {},
  },
  {
    name: "route_claude_reasoning",
    kind: "routing_eval",
    input_text: "이 긴 주장문의 논리 구조를 깊게 분석하고 반론까지 정리해줘",
    expected_json: {
      route: "claude",
    },
    style_constraints: {},
  },
  {
    name: "route_claude_compare",
    kind: "routing_eval",
    input_text: "두 가지 사업 전략의 장단점을 길게 비교해서 의사결정안을 써줘",
    expected_json: {
      route: "claude",
    },
    style_constraints: {},
  },
  {
    name: "route_codex_repo_structure",
    kind: "routing_eval",
    input_text: "이 저장소 구조를 읽고 핵심 파일을 설명해줘",
    expected_json: {
      route: "codex",
    },
    style_constraints: {},
  },
  {
    name: "route_codex_bug_hunt",
    kind: "routing_eval",
    input_text: "이 프로젝트에서 로그인 버그 원인을 찾고 수정 방향을 제안해줘",
    expected_json: {
      route: "codex",
    },
    style_constraints: {},
  },
  {
    name: "route_codex_test_failure",
    kind: "routing_eval",
    input_text: "테스트가 왜 실패하는지 코드 기준으로 분석해줘",
    expected_json: {
      route: "codex",
    },
    style_constraints: {},
  },
  {
    name: "route_local_simple_summary",
    kind: "routing_eval",
    input_text: "이 내용을 한 문단으로 요약해줘",
    expected_json: {
      route: "local",
    },
    style_constraints: {},
  },
  {
    name: "memory_store_language_pref",
    kind: "memory_eval",
    input_text: "앞으로 답변은 항상 한국어로 해줘",
    expected_json: {
      should_store: true,
      key_hint: "language",
    },
    style_constraints: {},
  },
  {
    name: "memory_store_no_slash",
    kind: "memory_eval",
    input_text: "나는 슬래시 명령 붙이는 거 싫어",
    expected_json: {
      should_store: true,
      key_hint: "command_style",
    },
    style_constraints: {},
  },
  {
    name: "memory_store_short_answers",
    kind: "memory_eval",
    input_text: "답변은 너무 길지 않게 해줘",
    expected_json: {
      should_store: true,
      key_hint: "answer_length",
    },
    style_constraints: {},
  },
  {
    name: "memory_store_search_pref",
    kind: "memory_eval",
    input_text: "최신 정보 질문은 검색을 꼭 먼저 해줘",
    expected_json: {
      should_store: true,
      key_hint: "search_preference",
    },
    style_constraints: {},
  },
  {
    name: "memory_ignore_lunch",
    kind: "memory_eval",
    input_text: "오늘 점심으로 김밥 먹었어",
    expected_json: {
      should_store: false,
    },
    style_constraints: {},
  },
  {
    name: "memory_ignore_battery",
    kind: "memory_eval",
    input_text: "지금 배터리 72퍼야",
    expected_json: {
      should_store: false,
    },
    style_constraints: {},
  },
  {
    name: "memory_ignore_weather_feel",
    kind: "memory_eval",
    input_text: "오늘은 그냥 좀 흐린 기분이야",
    expected_json: {
      should_store: false,
    },
    style_constraints: {},
  },
  {
    name: "memory_ignore_one_off_task",
    kind: "memory_eval",
    input_text: "지금 이 문장만 영어로 번역해줘",
    expected_json: {
      should_store: false,
    },
    style_constraints: {},
  },
];
