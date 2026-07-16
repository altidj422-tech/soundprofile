import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { getMe, signup } from "../lib/api/auth.functions";
import { Logo, PrimaryCTA, Spinner } from "../components/sp/ui";
import BorderGlow from "../components/reactbits/BorderGlow";
import { Field } from "./login";

export const Route = createFileRoute("/signup")({
  beforeLoad: async () => {
    const { user } = await getMe();
    if (user) throw redirect({ to: "/discover" });
  },
  component: SignupPage,
});

function SignupPage() {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signup({ data: { displayName, username, email, password } });
      if (!res.ok) {
        setError(res.error);
        setLoading(false);
        return;
      }
      window.location.href = "/onboarding";
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <Link to="/">
          <Logo />
        </Link>
        <Link
          to="/login"
          className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--sp-muted)] transition hover:text-[var(--sp-ink)]"
        >
          Log in
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center px-5 py-10">
        <BorderGlow
          glowColor="350 100 68"
          colors={["#ff5d73", "#ff9c5b", "#33e6c4"]}
          backgroundColor="#141026"
          borderRadius={22}
          glowRadius={38}
          animated
          className="w-full max-w-sm"
        >
          <div className="p-7">
          <h1 className="font-display text-3xl font-bold">Create your profile</h1>
          <p className="mt-2 text-sm text-[var(--sp-muted)]">
            Two minutes to a feed that knows what you play.
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <Field
              label="Display name"
              value={displayName}
              onChange={setDisplayName}
              autoComplete="name"
              placeholder="Alex Rivera"
            />
            <Field
              label="Username"
              value={username}
              onChange={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              autoComplete="username"
              placeholder="alexplays"
            />
            <Field
              label="Email"
              value={email}
              onChange={setEmail}
              type="email"
              autoComplete="email"
              placeholder="you@email.com"
            />
            <Field
              label="Password"
              value={password}
              onChange={setPassword}
              type="password"
              autoComplete="new-password"
              placeholder="At least 6 characters"
            />
            {error && <p className="text-sm text-[var(--sp-coral)]">{error}</p>}
            <PrimaryCTA type="submit" className="w-full" disabled={loading}>
              {loading ? <Spinner /> : "Create account"}
            </PrimaryCTA>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--sp-muted)]">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-[var(--sp-aqua)] hover:underline">
              Log in
            </Link>
          </p>
          </div>
        </BorderGlow>
      </div>
    </div>
  );
}
