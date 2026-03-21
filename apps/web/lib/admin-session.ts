"use client";

const KEY = "vibehub.adminSession";

export function getAdminSession() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(KEY) ?? "";
}

export function setAdminSession(value: string) {
  window.localStorage.setItem(KEY, value);
}
