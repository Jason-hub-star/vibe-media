import Link from "next/link";

import type { DiscoverItem } from "@vibehub/content-contracts";

import { presentDiscoverCategory } from "../presenter/present-discover-category";

export function DiscoverRegistryTable({ items }: { items: DiscoverItem[] }) {
  return (
    <div className="panel stack-tight">
      <table className="data-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Category</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <strong>{item.title}</strong>
                <p className="muted">{item.summary}</p>
              </td>
              <td>{presentDiscoverCategory(item.category).label}</td>
              <td>
                <span className={`status status-${item.status}`}>{item.status}</span>
              </td>
              <td>
                <div className="table-link-group">
                  {item.actions.map((action) => (
                    <Link className="inline-link" href={action.href} key={`${item.id}-${action.label}`}>
                      {action.label}
                    </Link>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
