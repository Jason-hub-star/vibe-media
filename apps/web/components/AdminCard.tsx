import Link from "next/link";
import type { ReactNode } from "react";

export interface AdminCardProps {
  id: string;
  href: string;
  title: string;
  subtitle?: string;
  status: string;
  statusLabel?: string;
  category?: string;
  categoryLabel?: string;
  metadata?: Array<{ label: string; value: string }>;
  actionSlot?: ReactNode;
}

export function AdminCard({
  href,
  title,
  subtitle,
  status,
  statusLabel,
  category,
  categoryLabel,
  metadata,
  actionSlot,
}: AdminCardProps) {
  return (
    <Link className="panel admin-card" href={href}>
      <div className="admin-card-header">
        <div className="stack-tight">
          <h3 className="admin-card-title">{title}</h3>
          {subtitle && <p className="admin-card-subtitle">{subtitle}</p>}
        </div>
        <div className="admin-card-badges">
          <span className={`status status-${status}`}>
            {statusLabel ?? status}
          </span>
          {category && (
            <span className="status status-category">
              {categoryLabel ?? category}
            </span>
          )}
        </div>
      </div>
      {metadata && metadata.length > 0 && (
        <dl className="admin-card-meta">
          {metadata.map((m) => (
            <div className="admin-card-meta-item" key={m.label}>
              <dt>{m.label}</dt>
              <dd>{m.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {actionSlot && (
        <div className="admin-card-actions" onClick={(e) => e.preventDefault()}>
          {actionSlot}
        </div>
      )}
    </Link>
  );
}
