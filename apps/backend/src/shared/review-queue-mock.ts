import type { ReviewItem } from "@vibehub/content-contracts";

export const reviewEntries: ReviewItem[] = [
  {
    id: "review-openai-agents-sdk",
    sourceLabel: "OpenAI News",
    sourceHref: "https://openai.com/news/",
    sourceExcerpt: "SDK 업데이트 원문과 changelog를 함께 읽고, 한국어 에디토리얼로 가공할 가치가 높은 항목입니다.",
    parsedSummary: "source, parsed, preview 세 면을 동시에 보고 최종 surface와 톤을 잠그기 위한 review 후보입니다.",
    keyPoints: [
      "direct source links 확보",
      "both surface candidate",
      "human-on-exception review queue"
    ],
    targetSurface: "both",
    confidence: 0.92,
    previewTitle: "OpenAI Agents SDK update",
    previewSummary: "VibeHub Brief와 Radar에 동시에 올라갈 수 있는 preview 초안입니다."
  },
  {
    id: "review-karpathy-interview",
    sourceLabel: "Transcript Mirror",
    sourceHref: "https://youtu.be/kwSVtQ7dziU",
    sourceExcerpt: "긴 인터뷰 원문에서 직접 인용 범위와 요약 강도를 사람이 마지막으로 잠가야 하는 review 예외 케이스입니다.",
    parsedSummary: "에이전트 운영, 장기 메모리, human-on-exception 축은 정리됐지만 브리프 톤과 인용 경계는 사람이 보는 편이 안전합니다.",
    keyPoints: [
      "brief-only candidate",
      "quote boundary review needed",
      "exception queue item"
    ],
    targetSurface: "brief",
    confidence: 0.78,
    previewTitle: "Karpathy on the loopy era of AI",
    previewSummary: "에이전트 운영을 중심으로 인터뷰 인사이트를 재구성한 preview 초안입니다."
  }
];
