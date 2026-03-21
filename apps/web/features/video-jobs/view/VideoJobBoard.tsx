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
        </article>
      ))}
    </div>
  );
}
