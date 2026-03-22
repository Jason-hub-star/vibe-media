import { AdminShell } from "@/components/AdminShell";
import { LoadingState } from "@/components/LoadingState";

export default function AdminLoading() {
  return (
    <AdminShell title="Loading…" subtitle="">
      <LoadingState />
    </AdminShell>
  );
}
