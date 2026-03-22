"use client";

import { AdminShell } from "@/components/AdminShell";
import { ErrorState } from "@/components/ErrorState";

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <AdminShell title="Error" subtitle="">
      <ErrorState message="Failed to load admin page." onRetry={reset} />
    </AdminShell>
  );
}
