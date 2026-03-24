import { AdminShell } from "@/components/AdminShell";
import { PolicySummaryGrid } from "@/features/policies/view/PolicySummaryGrid";
import { ProgramReferenceGrid } from "@/features/programs/view/ProgramReferenceGrid";
import { loadPolicyCards, loadProgramCards } from "@/lib/admin-docs";

export default async function AdminRulesPage() {
  const [policyCards, programCards] = await Promise.all([
    loadPolicyCards(),
    loadProgramCards(),
  ]);

  return (
    <AdminShell
      subtitle="검수·소스 등급·발행 규칙과 프로그램 규칙을 한곳에서 참조합니다"
      title="운영 규칙"
    >
      <section>
        <h2 className="section-heading">정책</h2>
        <PolicySummaryGrid cards={policyCards} />
      </section>
      <section>
        <h2 className="section-heading">프로그램</h2>
        <ProgramReferenceGrid cards={programCards} />
      </section>
    </AdminShell>
  );
}
