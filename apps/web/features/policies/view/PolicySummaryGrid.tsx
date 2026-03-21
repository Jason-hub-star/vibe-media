const policyCards = [
  {
    id: "review-policy",
    eyebrow: "Review",
    title: "REVIEW-POLICY.md",
    body: "예외만 검수한다는 기본 원칙과, 미성년자 영상은 부모 검수를 항상 남긴다는 예외 규칙을 함께 본다."
  },
  {
    id: "source-tier",
    eyebrow: "Source tier",
    title: "SOURCE-TIER-POLICY.md",
    body: "auto-safe, render-required, manual-review-required, blocked 네 층을 기준으로 자동화 범위를 조정한다."
  },
  {
    id: "publish-rules",
    eyebrow: "Publish",
    title: "AUTO-PUBLISH-RULES.md",
    body: "기본 자동화 한계는 scheduled/private queue까지이며, 즉시 공개는 기본값이 아니다."
  }
];

export function PolicySummaryGrid() {
  return (
    <div className="panel-grid">
      {policyCards.map((card) => (
        <article className="panel stack-tight" key={card.id}>
          <p className="eyebrow">{card.eyebrow}</p>
          <h2>{card.title}</h2>
          <p className="muted">{card.body}</p>
        </article>
      ))}
    </div>
  );
}
