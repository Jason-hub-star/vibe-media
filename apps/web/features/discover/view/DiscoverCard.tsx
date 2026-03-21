import Link from "next/link";

import type { DiscoverItem } from "@vibehub/content-contracts";

import { presentDiscoverCategory } from "../presenter/present-discover-category";

export function DiscoverCard({ item }: { item: DiscoverItem }) {
  return (
    <article className="panel stack-tight">
      <div className="row-between">
        <p className="eyebrow">{presentDiscoverCategory(item.category)}</p>
        <span className={`status status-${item.status}`}>{item.status}</span>
      </div>
      <div className="stack-tight">
        <h3>{item.title}</h3>
        <p className="muted">{item.summary}</p>
      </div>
      <div className="tag-row">
        {item.tags.map((tag) => (
          <span className="tag-chip" key={tag}>
            {tag}
          </span>
        ))}
      </div>
      <div className="button-row">
        {item.actions.map((action) => (
          <Link className="button-secondary" href={action.href} key={`${item.id}-${action.kind}`}>
            {action.label}
          </Link>
        ))}
      </div>
    </article>
  );
}
