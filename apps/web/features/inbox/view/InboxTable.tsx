import type { InboxItem } from "@vibehub/content-contracts";

import { presentInboxConfidence } from "../presenter/present-inbox-confidence";
import { presentInboxNextQueue } from "../presenter/present-inbox-next-queue";

export function InboxTable({ items }: { items: InboxItem[] }) {
  return (
    <div className="panel stack-tight">
      <table className="data-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Source</th>
            <th>Stage</th>
            <th>Surface</th>
            <th>Next queue</th>
            <th>Confidence</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <strong>{item.title}</strong>
                <p className="muted">{item.parsedSummary}</p>
              </td>
              <td>
                <strong>{item.sourceName}</strong>
                <p className="muted">{item.sourceTier}</p>
              </td>
              <td>
                <span className={`status status-${item.stage}`}>{item.stage}</span>
              </td>
              <td>
                <span className={`status status-${item.targetSurface}`}>{item.targetSurface}</span>
              </td>
              <td>
                <span className={`status status-${presentInboxNextQueue(item).replace(" ", "-")}`}>
                  {presentInboxNextQueue(item)}
                </span>
              </td>
              <td>{presentInboxConfidence(item.confidence)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
