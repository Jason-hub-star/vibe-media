import type { ToolSubmission } from "@vibehub/content-contracts";

export function ToolSubmissionDetailContent({ item }: { item: ToolSubmission }) {
  return (
    <>
      <div className="panel stack-tight">
        <p className="eyebrow">Summary</p>
        <p>{item.summary}</p>
        {item.description ? <p className="muted">{item.description}</p> : null}
      </div>

      <div className="panel stack-tight">
        <p className="eyebrow">Links</p>
        <a className="inline-link" href={item.websiteUrl} rel="noopener noreferrer" target="_blank">
          Website
        </a>
        {item.demoUrl ? (
          <a className="inline-link" href={item.demoUrl} rel="noopener noreferrer" target="_blank">
            Demo
          </a>
        ) : null}
        {item.githubUrl ? (
          <a className="inline-link" href={item.githubUrl} rel="noopener noreferrer" target="_blank">
            GitHub
          </a>
        ) : null}
        {item.docsUrl ? (
          <a className="inline-link" href={item.docsUrl} rel="noopener noreferrer" target="_blank">
            Docs
          </a>
        ) : null}
      </div>

      <div className="panel stack-tight">
        <p className="eyebrow">Screening</p>
        <dl className="admin-detail-meta">
          <div className="admin-detail-row">
            <dt className="admin-detail-label">Status</dt>
            <dd className="admin-detail-value">{item.status}</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">Screening</dt>
            <dd className="admin-detail-value">{item.screeningStatus}</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">Score</dt>
            <dd className="admin-detail-value">{item.screeningScore}</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">Target locales</dt>
            <dd className="admin-detail-value">{item.targetLocales.join(", ") || "-"}</dd>
          </div>
        </dl>
        <div className="stack-tight">
          {item.screeningNotes.length === 0 ? (
            <p className="muted">No automated notes recorded.</p>
          ) : (
            item.screeningNotes.map((note) => <p key={note}>{note}</p>)
          )}
        </div>
      </div>

      <div className="panel stack-tight">
        <p className="eyebrow">Submitter</p>
        <dl className="admin-detail-meta">
          <div className="admin-detail-row">
            <dt className="admin-detail-label">Email</dt>
            <dd className="admin-detail-value">{item.submitterEmail}</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">Name</dt>
            <dd className="admin-detail-value">{item.submitterName ?? "-"}</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">Created</dt>
            <dd className="admin-detail-value">{item.createdAt}</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">Promoted showcase</dt>
            <dd className="admin-detail-value">{item.promotedShowcaseEntryId ?? "-"}</dd>
          </div>
        </dl>
      </div>
    </>
  );
}
