"use client";

const KEY = "vibehub.adminSession";
const EVENT_NAME = "vibehub:admin-session-change";

export function getAdminSession() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(KEY) ?? "";
}

export function setAdminSession(value: string) {
  window.localStorage.setItem(KEY, value);
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function subscribeAdminSession(callback: () => void) {
  const handler = () => callback();
  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener("storage", handler);

  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener("storage", handler);
  };
}
