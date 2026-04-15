"use client";

import { useEffect, useRef } from "react";

import { trackGaEvent } from "@/lib/ga-event";

interface BriefScrollTrackerProps {
  slug: string;
  locale: string;
}

function getScrollPercent(): number {
  const root = document.documentElement;
  const scrollTop = Math.max(root.scrollTop, document.body.scrollTop);
  const viewport = window.innerHeight;
  const fullHeight = root.scrollHeight;
  if (fullHeight <= viewport) return 100;
  return Math.min(100, ((scrollTop + viewport) / fullHeight) * 100);
}

/** Fires one-time scroll depth events for brief detail pages. */
export function BriefScrollTracker({ slug, locale }: BriefScrollTrackerProps) {
  const fired50Ref = useRef(false);
  const fired90Ref = useRef(false);

  useEffect(() => {
    fired50Ref.current = false;
    fired90Ref.current = false;

    let ticking = false;
    const check = () => {
      const percent = getScrollPercent();
      if (!fired50Ref.current && percent >= 50) {
        fired50Ref.current = true;
        trackGaEvent("brief_scroll_50", { slug, locale, depth_percent: 50 });
      }
      if (!fired90Ref.current && percent >= 90) {
        fired90Ref.current = true;
        trackGaEvent("brief_scroll_90", { slug, locale, depth_percent: 90 });
      }
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        check();
      });
    };

    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [slug, locale]);

  return null;
}

