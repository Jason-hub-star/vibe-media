import { presentReviewAction } from "../presenter/present-review-action";

import type { BriefListItem } from "@vibehub/content-contracts";

export function AdminBriefTable({ briefs }: { briefs: BriefListItem[] }) {
  return (
    <div className="panel">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Brief</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {briefs.map((brief) => (
            <tr key={brief.slug}>
              <td>{brief.title}</td>
              <td><span className={`status status-${brief.status}`}>{brief.status}</span></td>
              <td>{presentReviewAction(brief.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
