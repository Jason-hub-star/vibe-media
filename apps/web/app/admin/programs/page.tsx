import { AdminShell } from "@/components/AdminShell";
import { ProgramReferenceGrid } from "@/features/programs/view/ProgramReferenceGrid";
import { loadProgramCards } from "@/lib/admin-docs";

export default async function AdminProgramsPage() {
  const cards = await loadProgramCards();

  return (
    <AdminShell
      subtitle="Program-style rule files sit above implementation code and define how the pipeline should behave."
      title="Programs"
    >
      <ProgramReferenceGrid cards={cards} />
    </AdminShell>
  );
}
