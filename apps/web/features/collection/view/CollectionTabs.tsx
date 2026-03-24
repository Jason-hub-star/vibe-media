"use client";

import { Suspense, type ReactNode } from "react";
import { AdminTabSwitcher, useTabParam } from "@/features/shared/view/AdminTabSwitcher";

const TABS = [
  { key: "inbox", label: "수신함" },
  { key: "runs", label: "실행 이력" },
] as const;

export function CollectionTabs({
  inboxSlot,
  runsSlot,
}: {
  inboxSlot: ReactNode;
  runsSlot: ReactNode;
}) {
  return (
    <Suspense>
      <Inner inboxSlot={inboxSlot} runsSlot={runsSlot} />
    </Suspense>
  );
}

function Inner({
  inboxSlot,
  runsSlot,
}: {
  inboxSlot: ReactNode;
  runsSlot: ReactNode;
}) {
  const [activeTab, setTab] = useTabParam("inbox");

  return (
    <>
      <AdminTabSwitcher
        tabs={[...TABS]}
        activeTab={activeTab}
        onTabChange={setTab}
      />
      <div role="tabpanel">
        {activeTab === "runs" ? runsSlot : inboxSlot}
      </div>
    </>
  );
}
