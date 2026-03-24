"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";

interface Tab {
  key: string;
  label: string;
}

export function AdminTabSwitcher({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (key: string) => void;
}) {
  return (
    <div className="admin-tab-bar" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`admin-tab${activeTab === tab.key ? " admin-tab--active" : ""}`}
          onClick={() => onTabChange(tab.key)}
          role="tab"
          aria-selected={activeTab === tab.key}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/** Hook that syncs tab state with URL ?tab= param. */
export function useTabParam(defaultTab: string) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = searchParams.get("tab") ?? defaultTab;

  const setTab = useCallback(
    (key: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (key === defaultTab) {
        params.delete("tab");
      } else {
        params.set("tab", key);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname, defaultTab],
  );

  return [activeTab, setTab] as const;
}
