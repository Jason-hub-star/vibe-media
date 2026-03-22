import { AdminShell } from "@/components/AdminShell";
import { listBriefs } from "@/features/admin-briefs/use-case/list-briefs";
import { listAssetSlots } from "@/features/assets/use-case/list-asset-slots";
import { listDiscoverItems } from "@/features/discover/use-case/list-discover-items";
import { listExceptionQueue } from "@/features/exceptions/use-case/list-exception-queue";
import { listInboxItems } from "@/features/inbox/use-case/list-inbox-items";
import { listPublishQueue } from "@/features/publish/use-case/list-publish-queue";
import { listReviewItems } from "@/features/review/use-case/list-review-items";
import { listRuns } from "@/features/runs/use-case/list-runs";
import { listSources } from "@/features/sources/use-case/list-sources";
import { listVideoJobs } from "@/features/video-jobs/use-case/list-video-jobs";

export default async function AdminPage() {
  const [inboxItems, briefs, runs, publishQueue, exceptionQueue, sources, discoverItems, reviewItems, videoJobs, assetSlots] = await Promise.all([
    listInboxItems(),
    listBriefs(),
    listRuns(),
    listPublishQueue(),
    listExceptionQueue(),
    listSources(),
    listDiscoverItems(),
    listReviewItems(),
    listVideoJobs(),
    listAssetSlots()
  ]);

  const summaryCards = [
    {
      id: "inbox",
      eyebrow: "Inbox",
      count: inboxItems.length,
      body: "Newly collected items waiting for surface routing"
    },
    {
      id: "briefs",
      eyebrow: "Briefs",
      count: briefs.length,
      body: "Review and scheduling queue"
    },
    {
      id: "runs",
      eyebrow: "Runs",
      count: runs.length,
      body: "Collection and parsing history with retry checkpoints"
    },
    {
      id: "publish",
      eyebrow: "Publish",
      count: publishQueue.length,
      body: "Scheduled briefs, discovery items, and private video uploads in one queue"
    },
    {
      id: "exceptions",
      eyebrow: "Exceptions",
      count: exceptionQueue.length,
      body: "Low-confidence, blocked, and policy-sensitive items waiting for intervention"
    },
    {
      id: "video-jobs",
      eyebrow: "Video jobs",
      count: videoJobs.length,
      body: "Gameplay and recap automation checkpoints"
    },
    {
      id: "sources",
      eyebrow: "Sources",
      count: sources.length,
      body: "Tracked feeds and trust layer"
    },
    {
      id: "discover",
      eyebrow: "Discover",
      count: discoverItems.length,
      body: "Curated open source, skills, sites, events, and contest registry"
    },
    {
      id: "assets",
      eyebrow: "Assets",
      count: assetSlots.length,
      body: "Placeholder slots and replacement specs"
    },
    {
      id: "review",
      eyebrow: "Review",
      count: reviewItems.length,
      body: "Exception-only review candidates still waiting for operator judgment"
    }
  ];

  return (
    <AdminShell
      subtitle="Review briefs, track video jobs, and prepare assets from one operator shell."
      title="VibeHub Admin"
    >
      <div className="summary-grid">
        {summaryCards.map((card) => (
          <article className="panel stack-tight" key={card.id}>
            <div className="row-between">
              <p className="eyebrow">{card.eyebrow}</p>
              <strong>{card.count}</strong>
            </div>
            <p>{card.body}</p>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
