import type { IngestRun } from "@vibehub/content-contracts";

import { presentRunWindow } from "../presenter/present-run-window";

export function RunTable({ runs }: { runs: IngestRun[] }) {
  return (
    <div className="panel stack-tight">
      <table className="data-table">
        <thead>
          <tr>
            <th>Source</th>
            <th>Status</th>
            <th>Window</th>
            <th>Items</th>
            <th>Failure</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id}>
              <td>
                <strong>{run.sourceName}</strong>
                <p className="muted">{run.id}</p>
              </td>
              <td>
                <span className={`status status-${run.runStatus}`}>{run.runStatus}</span>
              </td>
              <td>{presentRunWindow(run.startedAt, run.finishedAt)}</td>
              <td>{run.itemCount}</td>
              <td>{run.errorMessage ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
