import Link from "next/link";

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
import { listImportedToolCandidates } from "@/features/tool-candidate-imports/use-case/list-imported-tool-candidates";
import { listToolSubmissions } from "@/features/tool-submissions/use-case/list-tool-submissions";
import { listVideoJobs } from "@/features/video-jobs/use-case/list-video-jobs";
import { getRecentCompletions } from "@/features/admin-dashboard/use-case/get-recent-completions";
import { getDeploymentReadiness } from "@/features/admin-dashboard/use-case/get-deployment-readiness";
import { RecentCompletions } from "@/features/admin-dashboard/view/RecentCompletions";
import { DeploymentReadiness } from "@/features/admin-dashboard/view/DeploymentReadiness";
import { AutomationTrail } from "@/features/admin-dashboard/view/AutomationTrail";
import { PipelineMonitorClient } from "./pipeline/PipelineMonitorClient";

export default async function AdminPage() {
  const [
    inboxItems,
    briefs,
    runs,
    publishQueue,
    exceptionQueue,
    sources,
    discoverItems,
    reviewItems,
    importedCandidates,
    submissions,
    videoJobs,
    assetSlots,
    recentCompletions,
    deploymentReadiness,
  ] = await Promise.all([
    listInboxItems().catch(() => []),
    listBriefs().catch(() => []),
    listRuns().catch(() => []),
    listPublishQueue().catch(() => []),
    listExceptionQueue().catch(() => []),
    listSources().catch(() => []),
    listDiscoverItems().catch(() => []),
    listReviewItems().catch(() => []),
    listImportedToolCandidates().catch(() => []),
    listToolSubmissions().catch(() => []),
    Promise.resolve().then(() => listVideoJobs()).catch(() => []),
    Promise.resolve().then(() => listAssetSlots()).catch(() => []),
    getRecentCompletions(),
    getDeploymentReadiness(),
  ]);

  const summaryCards = [
    { id: "collection", href: "/admin/collection", label: "수집 현황", count: inboxItems.length + runs.length, body: "수신함과 실행 이력" },
    { id: "briefs", href: "/admin/briefs", label: "브리프", count: briefs.length, body: "검수 및 예약 대기열" },
    { id: "pending", href: "/admin/pending", label: "검토 대기", count: reviewItems.length + exceptionQueue.length, body: "검수 대기와 예외 처리" },
    { id: "publish", href: "/admin/publish", label: "발행", count: publishQueue.length, body: "발행 큐에 있는 항목" },
    { id: "video-jobs", href: "/admin/video-jobs", label: "비디오 작업", count: videoJobs.length, body: "영상 자동화 체크포인트" },
    { id: "sources", href: "/admin/sources", label: "소스", count: sources.length, body: "등록된 피드와 신뢰 레이어" },
    { id: "discover", href: "/admin/discover", label: "디스커버리", count: discoverItems.length, body: "큐레이션 레지스트리 항목" },
    { id: "imported-tools", href: "/admin/imported-tools", label: "가져온 툴 후보", count: importedCandidates.length, body: "외부 소스에서 수집한 후보 레인" },
    { id: "submissions", href: "/admin/submissions", label: "툴 제출", count: submissions.length, body: "비로그인 제출과 자동 심사 결과" },
    { id: "assets", href: "/admin/assets", label: "에셋", count: assetSlots.length, body: "이미지 슬롯과 교체 사양" },
  ];

  return (
    <AdminShell
      subtitle="파이프라인 상태와 대기열 현황을 한눈에 확인합니다"
      title="VibeHub 운영실"
    >
      {/* 1. 최근 완료 항목 */}
      <RecentCompletions items={recentCompletions} />

      {/* 2. 배포 준비 현황 */}
      <DeploymentReadiness data={deploymentReadiness} />

      {/* 3. 대기열 현황 */}
      <section className="admin-queue-overview">
        <h2 className="section-heading">대기열 현황</h2>
        <div className="summary-grid">
          {summaryCards.map((card) => (
            <Link className="panel summary-card" href={card.href} key={card.id}>
              <div className="row-between">
                <p className="eyebrow">{card.label}</p>
                <strong className="summary-count">{card.count}</strong>
              </div>
              <p className="summary-body">{card.body}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. 자동화 이력 */}
      <AutomationTrail />

      {/* 파이프라인 모니터 */}
      <PipelineMonitorClient />
    </AdminShell>
  );
}
