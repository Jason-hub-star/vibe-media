"use client";

import { useEffect } from "react";

/** Sync <html lang> with the current locale segment. */
export function SetHtmlLang({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
