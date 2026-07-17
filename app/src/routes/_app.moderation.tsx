import { createFileRoute, Link, useRouter } from "@tanstack/react-router";

import { shortDate } from "../lib/catalog";
import { listReports, resolveReport } from "../lib/api/reports.functions";
import { EmptyState } from "../components/sp/ui";

export const Route = createFileRoute("/_app/moderation")({
  loader: async () => listReports(),
  component: ModerationPage,
});

function ModerationPage() {
  const { isModerator, reports } = Route.useLoaderData();
  const router = useRouter();

  if (!isModerator) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16">
        <EmptyState title="Moderator access only" icon="🛡️">
          This area is for trusted, high-reputation members.{" "}
          <Link to="/discover" className="text-[var(--sp-aqua)]">
            Back to feed
          </Link>
        </EmptyState>
      </div>
    );
  }

  async function resolve(id: number) {
    await resolveReport({ data: { reportId: id } });
    router.invalidate();
  }

  return (
    <div className="mx-auto max-w-3xl px-5 pb-28 pt-8 lg:pb-12 lg:pt-10">
      <h1 className="font-display text-3xl font-bold">Moderation</h1>
      <p className="mt-1.5 text-[15px] text-[var(--sp-muted)]">
        Open reports from the community. Resolving one clears it from this list — use your
        moderator powers (delete comments, rewrite tags) on the content itself.
      </p>

      {reports.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="All clear" icon="✅">
            No open reports right now.
          </EmptyState>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {reports.map((r) => (
            <li key={r.id} className="rounded-2xl border border-[var(--sp-line)] bg-white/[0.02] p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--sp-faint)]">
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 font-semibold uppercase tracking-wide text-[var(--sp-muted)]">
                  {r.targetType}
                </span>
                <span>reported by @{r.reporter}</span>
                <span>· {shortDate(r.createdAt)}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-[var(--sp-ink)]/90">
                “{r.snippet}”
              </p>
              {r.reason && (
                <p className="mt-1 text-xs text-[var(--sp-muted)]">Reason: {r.reason}</p>
              )}
              <div className="mt-3 flex items-center gap-3">
                {r.targetType === "comment" && r.songId != null && (
                  <Link
                    to="/songs/$id"
                    params={{ id: String(r.songId) }}
                    className="text-xs font-semibold text-[var(--sp-aqua)] hover:underline"
                  >
                    View song →
                  </Link>
                )}
                {r.targetType === "user" && r.targetUsername && (
                  <Link
                    to="/u/$username"
                    params={{ username: r.targetUsername }}
                    className="text-xs font-semibold text-[var(--sp-aqua)] hover:underline"
                  >
                    View profile →
                  </Link>
                )}
                <button
                  onClick={() => resolve(r.id)}
                  className="ml-auto rounded-full border border-[var(--sp-line-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--sp-muted)] transition hover:text-[var(--sp-ink)]"
                >
                  Mark resolved
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
