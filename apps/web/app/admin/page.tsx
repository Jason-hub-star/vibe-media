import { AdminShell } from "@/components/AdminShell";

export default function AdminPage() {
  return (
    <AdminShell
      subtitle="Review briefs, track video jobs, and prepare assets from one operator shell."
      title="VibeHub Admin"
    >
      <div className="summary-grid">
        <article className="panel stack-tight">
          <p className="eyebrow">Briefs</p>
          <p>Review and scheduling queue</p>
        </article>
        <article className="panel stack-tight">
          <p className="eyebrow">Video jobs</p>
          <p>Gameplay and recap automation checkpoints</p>
        </article>
        <article className="panel stack-tight">
          <p className="eyebrow">Sources</p>
          <p>Tracked feeds and trust layer</p>
        </article>
        <article className="panel stack-tight">
          <p className="eyebrow">Discover</p>
          <p>Curated open source, skills, sites, events, and contest registry</p>
        </article>
        <article className="panel stack-tight">
          <p className="eyebrow">Assets</p>
          <p>Placeholder slots and replacement specs</p>
        </article>
      </div>
    </AdminShell>
  );
}
