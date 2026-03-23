import { AdminShell } from "@/components/AdminShell";
import { ProgramReferenceGrid } from "@/features/programs/view/ProgramReferenceGrid";
import { loadProgramCards } from "@/lib/admin-docs";

export default async function AdminProgramsPage() {
  const cards = await loadProgramCards();

  return (
    <AdminShell
      subtitle="파이프라인 동작을 정의하는 프로그램 규칙 파일입니다"
      title="프로그램 참조"
    >
      <ProgramReferenceGrid cards={cards} />
    </AdminShell>
  );
}
