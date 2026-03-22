import type { PublishQueueItem } from "@vibehub/content-contracts";

import { presentPublishWindow } from "../presenter/present-publish-window";
import { PublishActionCell } from "./PublishActionCell";

export function PublishQueueTable({ items }: { items: PublishQueueItem[] }) {
  return (
    <div className="panel stack-tight">
      <table className="data-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Surface</th>
            <th>Queue state</th>
            <th>Window</th>
            <th>Next action</th>
            <th>Actions</th>
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
                <span className={`status status-${item.queueStatus}`}>{item.queueStatus}</span>
              </td>
              <td>{presentPublishWindow(item.scheduledFor)}</td>
              <td>{item.nextAction}</td>
              <td>
                <PublishActionCell
                  itemId={item.id}
                  targetType={item.targetType}
                  queueStatus={item.queueStatus}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
