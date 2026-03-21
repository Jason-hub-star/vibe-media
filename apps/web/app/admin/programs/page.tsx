import { AdminShell } from "@/components/AdminShell";
import { ProgramReferenceGrid } from "@/features/programs/view/ProgramReferenceGrid";

export default function AdminProgramsPage() {
  return (
    <AdminShell
      subtitle="Program-style rule files sit above implementation code and define how the pipeline should behave."
      title="Programs"
    >
      <ProgramReferenceGrid />
    </AdminShell>
  );
}
