"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState, useSyncExternalStore } from "react";

import { getAdminSession, setAdminSession, subscribeAdminSession } from "@/lib/admin-session";

/* ── Top-level link (no group) ── */
const overviewLink = { href: "/admin", label: "Overview", exact: true } as const;

/* ── Grouped sidebar links ── */
interface SidebarLink {
  href: string;
  label: string;
  exact?: boolean;
}

interface SidebarGroup {
  name: string;
  links: readonly SidebarLink[];
}

const sidebarGroups: readonly SidebarGroup[] = [
  {
    name: "Pipeline",
    links: [
      { href: "/admin/pipeline", label: "Pipeline" },
      { href: "/admin/inbox", label: "Inbox" },
      { href: "/admin/runs", label: "Runs" },
      { href: "/admin/sources", label: "Sources" },
    ],
  },
  {
    name: "Editorial",
    links: [
      { href: "/admin/briefs", label: "Briefs" },
      { href: "/admin/review", label: "Review" },
      { href: "/admin/publish", label: "Publish" },
      { href: "/admin/exceptions", label: "Exceptions" },
    ],
  },
  {
    name: "Registry",
    links: [
      { href: "/admin/discover", label: "Discover" },
      { href: "/admin/showcase", label: "Showcase" },
      { href: "/admin/video-jobs", label: "Video jobs" },
      { href: "/admin/assets", label: "Assets" },
    ],
  },
  {
    name: "Reference",
    links: [
      { href: "/admin/policies", label: "Policies" },
      { href: "/admin/programs", label: "Programs" },
    ],
  },
] as const;

const STORAGE_KEY = "admin-sidebar-collapsed";

function readCollapsed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeCollapsed(collapsed: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsed));
  } catch {
    /* storage full or blocked — silently ignore */
  }
}

function linkIsActive(link: SidebarLink, pathname: string) {
  if (link.exact) return pathname === link.href;
  return pathname.startsWith(link.href);
}

function groupContainsPath(group: SidebarGroup, pathname: string) {
  return group.links.some((l) => linkIsActive(l, pathname));
}

export function AdminShell({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const session = useSyncExternalStore(
    subscribeAdminSession,
    getAdminSession,
    () => null,
  );
  const [draft, setDraft] = useState("operator");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<string[]>(readCollapsed);

  const toggleGroup = useCallback(
    (name: string) => {
      setCollapsed((prev) => {
        const next = prev.includes(name)
          ? prev.filter((n) => n !== name)
          : [...prev, name];
        writeCollapsed(next);
        return next;
      });
    },
    []
  );

  function isGroupCollapsed(group: SidebarGroup) {
    /* Force open if the group contains the current route */
    if (groupContainsPath(group, pathname)) return false;
    return collapsed.includes(group.name);
  }

  if (!session) {
    if (session === null) {
      return <div className="shell admin-login" />;
    }

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
      <aside className={`panel admin-sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="row-between">
          <p className="eyebrow">Admin tools</p>
          <button
            aria-label="Toggle sidebar"
            className="sidebar-toggle"
            onClick={() => setSidebarOpen((v) => !v)}
            type="button"
          >
            {sidebarOpen ? "✕" : "☰"}
          </button>
        </div>
        <nav className="sidebar-nav">
          {/* Top-level Overview link */}
          <Link
            className={linkIsActive(overviewLink, pathname) ? "sidebar-link active" : "sidebar-link"}
            href={overviewLink.href}
            onClick={() => setSidebarOpen(false)}
          >
            {overviewLink.label}
          </Link>

          {/* Grouped links */}
          {sidebarGroups.map((group) => {
            const groupCollapsed = isGroupCollapsed(group);
            return (
              <div
                className={`sidebar-group${groupCollapsed ? " collapsed" : ""}`}
                key={group.name}
              >
                <button
                  className="sidebar-group-header"
                  onClick={() => toggleGroup(group.name)}
                  type="button"
                  aria-expanded={!groupCollapsed}
                >
                  <span>{group.name}</span>
                  <span className="sidebar-group-chevron" aria-hidden="true">
                    {groupCollapsed ? "▸" : "▾"}
                  </span>
                </button>
                <div className="sidebar-group-links">
                  {group.links.map((link) => (
                    <Link
                      className={linkIsActive(link, pathname) ? "sidebar-link active" : "sidebar-link"}
                      href={link.href}
                      key={link.href}
                      onClick={() => setSidebarOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
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
