import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import type { SessionUser } from "../../lib/types";
import { logout } from "../../lib/api/auth.functions";
import { Avatar, Logo, cx } from "./ui";

function CompassIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5 13 13l-4.5 2.5L11 11z" fill="currentColor" stroke="none" />
    </svg>
  );
}
function LibraryIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 19V6a2 2 0 0 1 2-2h2v15H6a2 2 0 0 1-2-2Z" />
      <path d="M10 19V4h2v15h-2Z" />
      <path d="m15 4.5 3.4.9a1 1 0 0 1 .7 1.2L16 19l-3-.8" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />
    </svg>
  );
}
function FriendsIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.1 2.9-5.5 6.5-5.5s6.5 2.4 6.5 5.5" />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 6M18 14.4c2.6.5 4.5 2.5 4.5 5" />
    </svg>
  );
}

const NAV = [
  { to: "/discover", label: "Discover", icon: <CompassIcon /> },
  { to: "/library", label: "Library", icon: <LibraryIcon /> },
  { to: "/friends", label: "Friends", icon: <FriendsIcon /> },
  { to: "/profile", label: "Profile", icon: <UserIcon /> },
] as const;

async function handleLogout() {
  try {
    await logout();
  } finally {
    if (typeof window !== "undefined") window.location.href = "/";
  }
}

export function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col lg:flex-row">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-[var(--sp-bg)]/70 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Link to="/discover">
          <Logo size={26} />
        </Link>
        <Link to="/profile" className="rounded-full">
          <Avatar
            name={user.displayName}
            hue={user.avatarHue}
            src={user.avatarUrl}
            size={34}
            ring
          />
        </Link>
      </header>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-white/10 bg-white/[0.025] px-4 py-6 backdrop-blur-xl lg:flex">
        <Link to="/discover" className="px-2">
          <Logo />
        </Link>
        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--sp-muted)] transition hover:bg-white/[0.04] hover:text-[var(--sp-ink)]"
              activeProps={{
                className:
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold bg-[var(--sp-coral)]/12 text-[var(--sp-ink)] shadow-[inset_0_0_0_1px_rgba(255,93,115,0.38)]",
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto">
          <Link
            to="/profile"
            className="flex items-center gap-3 rounded-xl border border-[var(--sp-line)] bg-white/[0.02] px-3 py-2.5 transition hover:bg-white/[0.05]"
          >
            <Avatar name={user.displayName} hue={user.avatarHue} src={user.avatarUrl} size={36} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-[var(--sp-ink)]">
                {user.displayName}
              </span>
              <span className="block truncate text-xs text-[var(--sp-faint)]">
                @{user.username}
              </span>
            </span>
          </Link>
          <button
            onClick={handleLogout}
            className="mt-2 w-full rounded-xl px-3 py-2 text-left text-xs font-medium text-[var(--sp-faint)] transition hover:text-[var(--sp-muted)]"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="min-w-0 flex-1">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-white/10 bg-[var(--sp-bg)]/70 backdrop-blur-xl lg:hidden">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-[var(--sp-faint)] transition"
            activeProps={{
              className:
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-[var(--sp-coral)]",
            }}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
        <button
          onClick={handleLogout}
          className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-[var(--sp-faint)]"
        >
          <UserIcon />
          Sign out
        </button>
      </nav>
    </div>
  );
}
