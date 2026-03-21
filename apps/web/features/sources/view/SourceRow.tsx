import Link from "next/link";

import type { SourceEntry } from "@vibehub/content-contracts";

import { presentSourceFreshness } from "../presenter/present-source-freshness";

export function SourceRow({ source }: { source: SourceEntry }) {
  return (
    <li className="source-row">
      <div>
        <strong>{source.label}</strong>
        <p className="muted">{source.category}</p>
      </div>
      <div className="source-row-meta">
        <span className="eyebrow">{presentSourceFreshness(source.freshness)}</span>
        <Link className="inline-link" href={source.href}>
          Visit
        </Link>
      </div>
    </li>
  );
}
