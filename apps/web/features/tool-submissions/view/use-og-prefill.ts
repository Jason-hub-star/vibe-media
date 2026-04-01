"use client";

import { useCallback, useRef, useState } from "react";

interface UseOgPrefillOptions {
  titleRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  summaryRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  onFieldChange?: () => void;
}

interface OgPrefillResult {
  isCrawling: boolean;
  ogImage: string | null;
  handleUrlBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function useOgPrefill({
  titleRef,
  summaryRef,
  onFieldChange,
}: UseOgPrefillOptions): OgPrefillResult {
  const [isCrawling, setIsCrawling] = useState(false);
  const [ogImage, setOgImage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleUrlBlur = useCallback(
    async (e: React.FocusEvent<HTMLInputElement>) => {
      const url = e.currentTarget.value.trim();
      if (!url || !isValidUrl(url)) return;

      const titleEmpty = !titleRef.current?.value.trim();
      const summaryEmpty = !summaryRef.current?.value.trim();

      if (!titleEmpty && !summaryEmpty) return;

      // Cancel any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsCrawling(true);

      try {
        const res = await fetch("/api/tools/og-preview", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url }),
          signal: controller.signal,
        });

        if (!res.ok) return;

        const data = (await res.json()) as {
          ogTitle?: string | null;
          ogDescription?: string | null;
          ogImage?: string | null;
        };

        let changed = false;

        if (data.ogTitle && titleRef.current && !titleRef.current.value.trim()) {
          titleRef.current.value = data.ogTitle;
          changed = true;
        }

        if (
          data.ogDescription &&
          summaryRef.current &&
          !summaryRef.current.value.trim()
        ) {
          summaryRef.current.value = data.ogDescription;
          changed = true;
        }

        if (data.ogImage) {
          setOgImage(data.ogImage);
          changed = true;
        }

        if (changed) {
          onFieldChange?.();
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      } finally {
        setIsCrawling(false);
      }
    },
    [titleRef, summaryRef, onFieldChange],
  );

  return { isCrawling, ogImage, handleUrlBlur };
}
