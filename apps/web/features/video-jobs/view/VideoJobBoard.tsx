import type { VideoJob } from "@vibehub/content-contracts";

import { presentVideoJobCopy } from "../presenter/present-video-job-copy";

export function VideoJobBoard({ jobs }: { jobs: VideoJob[] }) {
  return (
    <div className="admin-grid">
      {jobs.map((job) => (
        <article className="panel stack-tight" key={job.id}>
          <div className="row-between">
            <span className={`status status-${job.status}`}>{job.status}</span>
            <span className="eyebrow">{job.sourceSession}</span>
          </div>
          <h3>{job.title}</h3>
          <p className="muted">{presentVideoJobCopy(job)}</p>
          <dl className="stack-tight video-job-meta">
            <div className="row-between">
              <dt className="eyebrow">Assets</dt>
              <dd className={`status status-${job.assetLinkState}`}>{job.assetLinkState}</dd>
            </div>
            <div className="row-between">
              <dt className="eyebrow">Transcript</dt>
              <dd className={`status status-${job.transcriptState}`}>{job.transcriptState}</dd>
            </div>
            <div className="row-between">
              <dt className="eyebrow">Next action</dt>
              <dd>{job.nextAction}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}
