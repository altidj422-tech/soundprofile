import { useState } from "react";

import type { FriendStatus } from "../../lib/types";
import {
  acceptFriendRequest,
  removeFriend,
  sendFriendRequest,
} from "../../lib/api/friends.functions";
import { SolidCoral, Spinner, cx } from "./ui";

// A self-contained control that reflects and mutates the viewer's friendship
// with `userId`. It keeps its own optimistic status and calls `onChanged` so a
// parent can refresh derived data (counts, lists).
export function FriendButton({
  userId,
  status,
  onChanged,
  className,
}: {
  userId: number;
  status: FriendStatus;
  onChanged?: (next: FriendStatus) => void;
  className?: string;
}) {
  const [state, setState] = useState<FriendStatus>(status);
  const [busy, setBusy] = useState(false);

  // Keep in sync if the parent reloads with a fresh status.
  const [seen, setSeen] = useState(status);
  if (seen !== status) {
    setSeen(status);
    setState(status);
  }

  async function run(fn: () => Promise<{ status: FriendStatus }>, optimistic: FriendStatus) {
    setBusy(true);
    const prev = state;
    setState(optimistic);
    try {
      const res = await fn();
      setState(res.status);
      onChanged?.(res.status);
    } catch {
      setState(prev);
    } finally {
      setBusy(false);
    }
  }

  if (state === "me") return null;

  if (state === "incoming") {
    return (
      <div className={cx("flex items-center gap-2", className)}>
        <SolidCoral
          disabled={busy}
          onClick={() => run(() => acceptFriendRequest({ data: { userId } }), "friends")}
        >
          {busy ? <Spinner /> : "Accept"}
        </SolidCoral>
        <button
          disabled={busy}
          onClick={() => run(() => removeFriend({ data: { userId } }), "none")}
          className="rounded-full border border-[var(--sp-line-strong)] px-3.5 py-2 text-[13px] font-semibold text-[var(--sp-muted)] transition hover:text-[var(--sp-ink)] disabled:opacity-50"
        >
          Decline
        </button>
      </div>
    );
  }

  if (state === "friends") {
    return (
      <button
        disabled={busy}
        onClick={() => run(() => removeFriend({ data: { userId } }), "none")}
        title="Remove friend"
        className={cx(
          "group inline-flex items-center gap-1.5 rounded-full border border-[var(--sp-aqua)]/50 bg-[var(--sp-aqua)]/10 px-3.5 py-2 text-[13px] font-semibold text-[var(--sp-aqua)] transition hover:border-[var(--sp-coral)]/50 hover:bg-[var(--sp-coral)]/10 hover:text-[var(--sp-coral)] disabled:opacity-50",
          className,
        )}
      >
        {busy ? (
          <Spinner />
        ) : (
          <>
            <span className="group-hover:hidden">✓ Friends</span>
            <span className="hidden group-hover:inline">Remove</span>
          </>
        )}
      </button>
    );
  }

  if (state === "outgoing") {
    return (
      <button
        disabled={busy}
        onClick={() => run(() => removeFriend({ data: { userId } }), "none")}
        title="Cancel request"
        className={cx(
          "group inline-flex items-center gap-1.5 rounded-full border border-[var(--sp-line-strong)] bg-white/[0.03] px-3.5 py-2 text-[13px] font-semibold text-[var(--sp-muted)] transition hover:text-[var(--sp-coral)] disabled:opacity-50",
          className,
        )}
      >
        {busy ? (
          <Spinner />
        ) : (
          <>
            <span className="group-hover:hidden">Requested</span>
            <span className="hidden group-hover:inline">Cancel</span>
          </>
        )}
      </button>
    );
  }

  // 'none'
  return (
    <SolidCoral
      disabled={busy}
      onClick={() => run(() => sendFriendRequest({ data: { userId } }), "outgoing")}
      className={className}
    >
      {busy ? (
        <Spinner />
      ) : (
        <>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add friend
        </>
      )}
    </SolidCoral>
  );
}
