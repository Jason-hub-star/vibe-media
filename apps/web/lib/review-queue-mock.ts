import type { ReviewItem } from "@vibehub/content-contracts";

export const reviewItems: ReviewItem[] = [
  {
    id: "review-openai-agents-sdk",
    sourceItemId: "inbox-openai-agents-sdk",
    sourceLabel: "OpenAI News",
    sourceHref: "https://openai.com/news/",
    sourceExcerpt: "SDK 업데이트 원문과 changelog를 묶어 읽고, 한국어 브리프로 내릴 가치가 높은 항목입니다.",
    parsedSummary: "도구 호출 경계와 운영 추적성이 바뀐 점을 brief와 discover 둘 다에 반영할 수 있게 정리된 상태입니다.",
    keyPoints: [
      "source count 3 확보",
      "target surface both 후보",
      "critic pass 전 마지막 human check 필요"
    ],
    targetSurface: "both",
    reviewReason: "dual-surface routing needs operator confirmation",
    confidence: 0.92,
    previewTitle: "OpenAI Agents SDK update",
    previewSummary: "자동화 파이프라인 관점에서 SDK 변화가 왜 중요한지 한국어로 빠르게 읽히는 preview 초안입니다."
  },
  {
    id: "review-karpathy-interview",
    sourceItemId: "inbox-karpathy-interview",
    sourceLabel: "Transcript Mirror",
    sourceHref: "https://youtu.be/kwSVtQ7dziU",
    sourceExcerpt: "긴 인터뷰 원문을 브리프로 내리기 전에 직접 인용과 요약, 주장 강도를 다시 정리해야 하는 예외 케이스입니다.",
    parsedSummary: "에이전트 운영, human-on-exception, 장기 실행 메모리라는 세 축은 정리됐지만 인용 범위와 톤 보정이 남아 있습니다.",
    keyPoints: [
      "long-form source review needed",
      "brief surface candidate",
      "quote boundary needs human check"
    ],
    targetSurface: "brief",
    reviewReason: "quote boundary review needed",
    confidence: 0.78,
    previewTitle: "Karpathy on the loopy era of AI",
    previewSummary: "에이전트 운영 능력이 개발자의 핵심 숙련으로 이동하고 있다는 관점을 VibeHub 문맥으로 재구성한 preview 초안입니다."
  }
];
