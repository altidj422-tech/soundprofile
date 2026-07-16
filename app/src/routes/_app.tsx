import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { getMe } from "../lib/api/auth.functions";
import { AppShell } from "../components/sp/AppShell";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const { user, needsOnboarding } = await getMe();
    if (!user) throw redirect({ to: "/login" });
    if (needsOnboarding) throw redirect({ to: "/onboarding" });
    return { user };
  },
  component: AppLayout,
});

function AppLayout() {
  const { user } = Route.useRouteContext();
  return (
    <AppShell user={user}>
      <Outlet />
    </AppShell>
  );
}
