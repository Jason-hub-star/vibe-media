"use client";

import type { AutomationTrailEntry } from "@vibehub/content-contracts";
import { getAutomationTrail } from "../use-case/get-automation-trail";
import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

function getSnapshot(): AutomationTrailEntry[] {
  return getAutomationTrail();
}

function getServerSnapshot(): AutomationTrailEntry[] {
  return [];
}

export function AutomationTrail() {
  const trail = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <section className="admin-dashboard-section">
      <h2 className="section-heading">자동화 이력</h2>
      {trail.length === 0 ? (
        <p className="muted">파이프라인 실행 기록이 아직 없습니다.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>시간</th>
              <th>트리거</th>
              <th>단계</th>
              <th>처리 건수</th>
              <th>에러</th>
              <th>핵심 알림</th>
            </tr>
          </thead>
          <tbody>
            {trail.map((entry) => (
              <tr key={entry.runId}>
                <td>{new Date(entry.timestamp).toLocaleString("ko-KR")}</td>
                <td>
                  <span className={`status status-${entry.triggerType === "auto" ? "published" : "draft"}`}>
                    {entry.triggerType === "auto" ? "자동" : "수동"}
                  </span>
                </td>
                <td>
                  {entry.stagesCompleted}/{entry.stagesTotal}
                </td>
                <td>{entry.itemsProcessed}건</td>
                <td>
                  {entry.errors > 0 ? (
                    <span className="status status-failed">{entry.errors}</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  {entry.highlights.length > 0
                    ? entry.highlights.join(", ")
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
