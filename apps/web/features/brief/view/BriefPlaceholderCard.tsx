const placeholders = [
  {
    eyebrow: "Coming soon",
    title: "Daily AI brief",
    summary: "A concise summary of the day's most important AI developments, distilled from multiple sources.",
  },
  {
    eyebrow: "Coming soon",
    title: "Tool & model launches",
    summary: "New releases, API updates, and model benchmarks — reviewed and contextualized.",
  },
  {
    eyebrow: "Coming soon",
    title: "Research highlights",
    summary: "Key papers and breakthroughs explained with operational context for practitioners.",
  },
  {
    eyebrow: "Coming soon",
    title: "Industry moves",
    summary: "Funding rounds, partnerships, and strategic shifts shaping the AI landscape.",
  },
  {
    eyebrow: "Coming soon",
    title: "Policy & regulation",
    summary: "Government actions, safety frameworks, and compliance updates that affect builders.",
  },
  {
    eyebrow: "Coming soon",
    title: "Open source spotlight",
    summary: "Community projects, forks, and contributions worth tracking this week.",
  },
];

export function BriefPlaceholderCard({ index }: { index: number }) {
  const ph = placeholders[index % placeholders.length];

  return (
    <article className="panel stack-tight brief-placeholder">
      <div className="row-between">
        <span className="status status-draft">{ph.eyebrow}</span>
      </div>
      <h3>{ph.title}</h3>
      <p className="muted">{ph.summary}</p>
    </article>
  );
}
