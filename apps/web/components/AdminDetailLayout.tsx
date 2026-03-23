import type { ReactNode } from "react";
import Link from "next/link";

import { AdminBreadcrumb, type BreadcrumbItem } from "./AdminBreadcrumb";

interface MetadataEntry {
  label: string;
  value: ReactNode;
}

interface AdminDetailLayoutProps {
  backHref: string;
  backLabel: string;
  breadcrumbs: BreadcrumbItem[];
  title: string;
  status?: string;
  statusLabel?: string;
  metadata: MetadataEntry[];
  actionBar?: ReactNode;
  children: ReactNode;
}

export function AdminDetailLayout({
  backHref,
  backLabel,
  breadcrumbs,
  title,
  status,
  statusLabel,
  metadata,
  actionBar,
  children,
}: AdminDetailLayoutProps) {
  return (
    <div className="admin-detail">
      <AdminBreadcrumb items={breadcrumbs} />

      <div className="admin-detail-header">
        <div className="stack-tight">
          <Link className="admin-detail-back" href={backHref}>
            &larr; {backLabel}
          </Link>
          <h2 className="admin-detail-title">{title}</h2>
        </div>
        {status && (
          <span className={`status status-${status}`}>
            {statusLabel ?? status}
          </span>
        )}
      </div>

      {metadata.length > 0 && (
        <dl className="admin-detail-meta">
          {metadata.map((m) => (
            <div className="admin-detail-row" key={m.label}>
              <dt className="admin-detail-label">{m.label}</dt>
              <dd className="admin-detail-value">{m.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {actionBar && <div className="admin-detail-actions">{actionBar}</div>}

      <div className="admin-detail-body">{children}</div>
    </div>
  );
}
