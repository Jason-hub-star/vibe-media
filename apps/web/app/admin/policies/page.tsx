import { AdminShell } from "@/components/AdminShell";
import { PolicySummaryGrid } from "@/features/policies/view/PolicySummaryGrid";
import { loadPolicyCards } from "@/lib/admin-docs";

export default async function AdminPoliciesPage() {
  const cards = await loadPolicyCards();

  return (
    <AdminShell
      subtitle="검수, 소스 등급, 발행 규칙을 현행 정책과 대조합니다"
      title="정책 참조"
    >
      <PolicySummaryGrid cards={cards} />
    </AdminShell>
  );
}
