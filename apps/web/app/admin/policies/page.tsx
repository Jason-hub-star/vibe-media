import { AdminShell } from "@/components/AdminShell";
import { PolicySummaryGrid } from "@/features/policies/view/PolicySummaryGrid";

export default function AdminPoliciesPage() {
  return (
    <AdminShell
      subtitle="Review, source tier, and publish rules stay visible here so operator decisions are made against the current policy set."
      title="Policies"
    >
      <PolicySummaryGrid />
    </AdminShell>
  );
}
