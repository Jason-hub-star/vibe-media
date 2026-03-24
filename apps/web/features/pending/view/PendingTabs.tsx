"use client";

import { Suspense, type ReactNode } from "react";
import { AdminTabSwitcher, useTabParam } from "@/features/shared/view/AdminTabSwitcher";

const TABS = [
  { key: "review", label: "검수" },
  { key: "exceptions", label: "예외" },
] as const;

export function PendingTabs({
  reviewSlot,
  exceptionsSlot,
}: {
  reviewSlot: ReactNode;
  exceptionsSlot: ReactNode;
}) {
  return (
    <Suspense>
      <Inner reviewSlot={reviewSlot} exceptionsSlot={exceptionsSlot} />
    </Suspense>
  );
}

function Inner({
  reviewSlot,
  exceptionsSlot,
}: {
  reviewSlot: ReactNode;
  exceptionsSlot: ReactNode;
}) {
  const [activeTab, setTab] = useTabParam("review");

  return (
    <>
      <AdminTabSwitcher
        tabs={[...TABS]}
        activeTab={activeTab}
        onTabChange={setTab}
      />
      <div role="tabpanel">
        {activeTab === "exceptions" ? exceptionsSlot : reviewSlot}
      </div>
    </>
  );
}
