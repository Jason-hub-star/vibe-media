"use client";

import { useEffect } from "react";

import { trackGaEvent } from "@/lib/ga-event";

function toSnakeCase(value: string): string {
  return value
    .replace(/([A-Z])/g, "_$1")
    .replace(/^_/, "")
    .toLowerCase();
}

function toParamKey(datasetKey: string): string | null {
  if (!datasetKey.startsWith("ga")) return null;
  if (datasetKey === "gaEvent") return null;
  const trimmed = datasetKey.slice(2);
  if (!trimmed) return null;
  const camel = trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
  return toSnakeCase(camel);
}

/** Delegated click tracker for elements with data-ga-* attributes. */
export function GaClickTracker() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const tracked = target.closest<HTMLElement>("[data-ga-event]");
      if (!tracked) return;

      const eventName = tracked.dataset.gaEvent?.trim();
      if (!eventName) return;

      const params: Record<string, string> = {};
      for (const [key, value] of Object.entries(tracked.dataset)) {
        if (!value) continue;
        const paramKey = toParamKey(key);
        if (!paramKey) continue;
        params[paramKey] = value;
      }

      const href = tracked.getAttribute("href");
      if (href) params.link_url = href;

      trackGaEvent(eventName, params);
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return null;
}
