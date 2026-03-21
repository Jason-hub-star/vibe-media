const programCards = [
  {
    id: "brief-program",
    eyebrow: "Brief program",
    title: "docs/ref/programs/brief.program.md",
    body: "brief 초안 생성과 discard 기준, source coverage 기준을 정의하는 상위 규칙 파일이다."
  },
  {
    id: "discover-program",
    eyebrow: "Discover program",
    title: "docs/ref/programs/discover.program.md",
    body: "discover action link 품질과 category 적합성 기준을 잠그는 운영 규칙 파일이다."
  },
  {
    id: "publish-program",
    eyebrow: "Publish program",
    title: "docs/ref/programs/publish.program.md",
    body: "queue 등록, metadata completeness, policy escalation 조건을 정리한다."
  },
  {
    id: "source-policy",
    eyebrow: "Source policy",
    title: "docs/ref/programs/source.policy.md",
    body: "source tier 변경, retry 경계, blocked 승격 규칙을 적는 운영용 정책 파일이다."
  }
];

export function ProgramReferenceGrid() {
  return (
    <div className="panel-grid">
      {programCards.map((card) => (
        <article className="panel stack-tight" key={card.id}>
          <p className="eyebrow">{card.eyebrow}</p>
          <h2>{card.title}</h2>
          <p className="muted">{card.body}</p>
        </article>
      ))}
    </div>
  );
}
