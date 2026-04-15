"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const ADSENSE_PUBLISHER_ID = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID;

function resolveAdSenseClientId(value: string | undefined): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;
  if (normalized.startsWith("ca-pub-")) return normalized;
  return `ca-pub-${normalized}`;
}

type AdSlotProps = {
  slot: string;
  className?: string;
};

/** Responsive AdSense slot. Renders nothing when env/slot is not configured. */
export function AdSlot({ slot, className }: AdSlotProps) {
  const pushedRef = useRef(false);
  const clientId = resolveAdSenseClientId(ADSENSE_PUBLISHER_ID);

  useEffect(() => {
    if (!clientId || !slot || pushedRef.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedRef.current = true;
    } catch {
      // Ad blockers or script timing issues can throw; fail silently.
    }
  }, [clientId, slot]);

  if (!clientId || !slot) return null;

  return (
    <aside className={className}>
      <p className="eyebrow">Sponsored</p>
      <ins
        className="adsbygoogle"
        style={{ display: "block", minHeight: "120px" }}
        data-ad-client={clientId}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
