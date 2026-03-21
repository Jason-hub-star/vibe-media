import type { ExceptionQueueItem } from "@vibehub/content-contracts";

import { presentExceptionConfidence } from "../presenter/present-exception-confidence";

export function ExceptionQueueTable({ items }: { items: ExceptionQueueItem[] }) {
  return (
    <div className="panel stack-tight">
      <table className="data-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Surface</th>
            <th>Stage</th>
            <th>Reason</th>
            <th>Confidence</th>
            <th>Next action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <strong>{item.title}</strong>
                <p className="muted">{item.sourceLabel}</p>
              </td>
              <td>
                <span className={`status status-${item.targetType}`}>{item.targetType}</span>
              </td>
              <td>
                <span className={`status status-${item.currentStage}`}>{item.currentStage}</span>
              </td>
              <td>{item.reason}</td>
              <td>{presentExceptionConfidence(item.confidence)}</td>
              <td>{item.nextAction}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
