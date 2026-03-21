export function PolicySummaryGrid({
  cards
}: {
  cards: Array<{ id: string; eyebrow: string; title: string; body: string }>;
}) {
  return (
    <div className="panel-grid">
      {cards.map((card) => (
        <article className="panel stack-tight" key={card.id}>
          <p className="eyebrow">{card.eyebrow}</p>
          <h2>{card.title}</h2>
          <p className="muted">{card.body}</p>
        </article>
      ))}
    </div>
  );
}
