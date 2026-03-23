import type { ReactNode } from "react";

interface AdminCardGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
}

export function AdminCardGrid({ children, columns = 3 }: AdminCardGridProps) {
  return (
    <div
      className="admin-card-grid"
      style={{ "--card-cols": columns } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
