import type { ToolCandidateImport } from "@vibehub/content-contracts";

function externalLink(label: string, href: string | null) {
  if (!href) return null;
  return (
    <a className="button-secondary" href={href} rel="noreferrer" target="_blank">
      {label}
    </a>
  );
}

export function ToolCandidateImportCard({ item }: { item: ToolCandidateImport }) {
  return (
    <article className="panel stack-tight imported-card">
      <div className="row-between submission-card-header">
        <div className="stack-tight">
          <div className="imported-badge-row">
            <span className="eyebrow">Imported candidate</span>
            <span className="status status-imported">imported</span>
          </div>
          <h3>{item.title}</h3>
        </div>
        <span className={`status status-${item.status}`}>{item.status}</span>
      </div>
      <p className="muted">{item.summary}</p>
      <div className="tag-row">
        {item.tags.map((tag) => (
          <span className="tag-chip" key={`${item.id}-${tag}`}>
            {tag}
          </span>
        ))}
      </div>
      <div className="button-row">
        <a className="button-primary" href={item.websiteUrl} rel="noreferrer" target="_blank">
          Visit website
        </a>
        {externalLink("Source entry", item.sourceEntryUrl)}
        {externalLink("Demo", item.demoUrl)}
        {externalLink("GitHub", item.githubUrl)}
        {externalLink("Docs", item.docsUrl)}
      </div>
      <div className="stack-tight">
        <p className="submission-meta muted">
          Source: {item.sourceName} · Imported on {item.importedAt.slice(0, 10)}
        </p>
        <p className="submission-meta muted">
          Separate from direct submissions so attribution stays clear.
        </p>
      </div>
    </article>
  );
}
