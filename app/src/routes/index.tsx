import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  // No title/description here on purpose: the home page inherits the app's
  // editable page metadata from the root route (set via the marketplace meta
  // API — title/favicon/og), so a shared link to "/" shows the owner's values.
  // Add a `head` here only to give a SPECIFIC page its own title/description
  // (a deeper route's head overrides the root's for that page).
  component: Index,
});

// Replace this placeholder. Routes are server-rendered — keep render SSR-safe
// (no window/document at module top level or during render). See ./README.md.
function Index() {
  return (
    <div
      data-higgsfield-blank-page-placeholder="REMOVE_THIS"
      className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center"
    >
      <h1 className="text-2xl font-semibold tracking-tight">
        Your website will live here.
      </h1>
      <p className="text-base text-gray-500">
        Ask Higgsfield Supercomputer to build it.
      </p>
    </div>
  );
}
