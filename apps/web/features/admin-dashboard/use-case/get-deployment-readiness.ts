import type { DeploymentReadiness } from "@vibehub/content-contracts";
import { listBriefs } from "@/features/admin-briefs/use-case/list-briefs";
import { listPublishQueue } from "@/features/publish/use-case/list-publish-queue";
import { listExceptionQueue } from "@/features/exceptions/use-case/list-exception-queue";

export async function getDeploymentReadiness(): Promise<DeploymentReadiness> {
  const [briefs, publishQueue, exceptions] = await Promise.all([
    listBriefs().catch(() => []),
    listPublishQueue().catch(() => []),
    listExceptionQueue().catch(() => []),
  ]);

  const ready: DeploymentReadiness["ready"] = [];
  const needsReview: DeploymentReadiness["needsReview"] = [];
  const blocking: DeploymentReadiness["blocking"] = [];

  for (const p of publishQueue) {
    if (p.queueStatus === "published") {
      const publicUrl =
        p.targetType === "brief"
          ? `/brief/${p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`
          : p.targetType === "discover"
            ? "/radar"
            : undefined;
      ready.push({ type: p.targetType, title: p.title, publicUrl });
    } else if (p.queueStatus === "scheduled") {
      ready.push({ type: p.targetType, title: p.title, reason: `예약됨: ${p.scheduledFor ?? "시간 미정"}` });
    } else if (p.queueStatus === "policy_hold") {
      blocking.push({ type: p.targetType, title: p.title, reason: "정책 보류" });
    }
  }

  for (const b of briefs) {
    if (b.status === "review") {
      needsReview.push({ type: "brief", title: b.title, reason: "검수 대기 중" });
    }
  }

  for (const e of exceptions) {
    blocking.push({ type: e.targetType, title: e.title, reason: e.reason });
  }

  return { ready, needsReview, blocking };
}
