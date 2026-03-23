import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function AdminBreadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="admin-breadcrumb" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <span key={item.label}>
          {i > 0 && <span aria-hidden="true"> &gt; </span>}
          {item.href ? (
            <Link href={item.href}>{item.label}</Link>
          ) : (
            <span className="admin-breadcrumb-current">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
