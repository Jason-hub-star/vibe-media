import { AdminShell } from "@/components/AdminShell";
import { PolicySummaryGrid } from "@/features/policies/view/PolicySummaryGrid";
import { loadPolicyCards } from "@/lib/admin-docs";

export default async function AdminPoliciesPage() {
  const cards = await loadPolicyCards();

  return (
    <AdminShell
      subtitle="Review, source tier, and publish rules stay visible here so operator decisions are made against the current policy set."
      title="Policies"
    >
      <PolicySummaryGrid cards={cards} />
    </AdminShell>
  );
}
