"use client";

type EventParams = Record<string, string | number | boolean>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (command: "event", eventName: string, params?: EventParams) => void;
  }
}

/** Safe GA4 event sender. No-op when gtag is unavailable (blocked, unset, or not loaded). */
export function trackGaEvent(eventName: string, params?: EventParams) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  try {
    window.gtag("event", eventName, params);
  } catch {
    // Tracking should never block UI flow.
  }
}

