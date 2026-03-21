"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useState } from "react";

import { getAdminSession, setAdminSession } from "@/lib/admin-session";

const adminLinks = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/inbox", label: "Inbox" },
  { href: "/admin/briefs", label: "Brief review" },
  { href: "/admin/review", label: "Review" },
  { href: "/admin/runs", label: "Runs" },
  { href: "/admin/publish", label: "Publish" },
  { href: "/admin/exceptions", label: "Exceptions" },
  { href: "/admin/policies", label: "Policies" },
  { href: "/admin/programs", label: "Programs" },
  { href: "/admin/discover", label: "Discover" },
  { href: "/admin/video-jobs", label: "Video jobs" },
  { href: "/admin/sources", label: "Sources" },
  { href: "/admin/assets", label: "Assets" }
];

export function AdminShell({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const [session, setSession] = useState(() => getAdminSession());
  const [draft, setDraft] = useState("operator");

  if (!session) {
    return (
      <div className="shell admin-login">
        <div className="panel stack-tight">
          <p className="eyebrow">Admin local gate</p>
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
          <p className="muted">
            This is a local operator gate for the scaffold build, not a production auth system.
          </p>
          <form
            className="newsletter-form"
            onSubmit={(event) => {
              event.preventDefault();
              setAdminSession(draft);
              setSession(draft);
            }}
          >
            <label className="stack-tight">
              <span className="eyebrow">Local operator key</span>
              <input
                aria-label="Operator key"
                className="input"
                onChange={(event) => setDraft(event.target.value)}
                value={draft}
              />
            </label>
            <button className="button-primary" type="submit">
              Enter admin
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="shell admin-layout">
      <aside className="panel admin-sidebar">
        <p className="eyebrow">Admin tools</p>
        <nav className="admin-links">
          {adminLinks.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="admin-content">
        <div className="stack-tight">
          <p className="eyebrow">Operator workspace · local session</p>
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
