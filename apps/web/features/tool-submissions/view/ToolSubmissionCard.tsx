import type { ToolSubmission } from "@vibehub/content-contracts";
import { formatDateShort } from "@/lib/format-date";

function externalLink(label: string, href: string | null) {
  if (!href) return null;
  return (
    <a className="button-secondary" href={href} rel="noreferrer" target="_blank">
      {label}
    </a>
  );
}

export function ToolSubmissionCard({ item }: { item: ToolSubmission }) {
  return (
    <article className="panel stack-tight submission-card">
      <div className="row-between submission-card-header">
        <div className="stack-tight">
          <p className="eyebrow">Latest submission</p>
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
        {externalLink("Demo", item.demoUrl)}
        {externalLink("GitHub", item.githubUrl)}
        {externalLink("Docs", item.docsUrl)}
      </div>
      <p className="submission-meta muted">
        Submitted by {item.submitterName ?? "Community builder"} on {formatDateShort(item.createdAt)}
      </p>
    </article>
  );
}
