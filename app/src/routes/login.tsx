import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { getMe, login } from "../lib/api/auth.functions";
import { Logo, PrimaryCTA, Spinner } from "../components/sp/ui";
import BorderGlow from "../components/reactbits/BorderGlow";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const { user } = await getMe();
    if (user) throw redirect({ to: "/discover" });
  },
  component: LoginPage,
});

function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login({ data: { identifier, password } });
      if (!res.ok) {
        setError(res.error);
        setLoading(false);
        return;
      }
      window.location.href = "/discover";
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
          to="/signup"
          className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--sp-muted)] transition hover:text-[var(--sp-ink)]"
        >
          Create account
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center px-5 py-10">
        <BorderGlow
          glowColor="169 78 55"
          colors={["#ff5d73", "#ff9c5b", "#33e6c4"]}
          backgroundColor="#141026"
          borderRadius={22}
          glowRadius={38}
          animated
          className="w-full max-w-sm"
        >
          <div className="p-7">
          <h1 className="font-display text-3xl font-bold">Welcome back</h1>
          <p className="mt-2 text-sm text-[var(--sp-muted)]">
            Log in to open your feed and your set list.
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <Field
              label="Email or username"
              value={identifier}
              onChange={setIdentifier}
              autoComplete="username"
              placeholder="you@email.com"
            />
            <Field
              label="Password"
              value={password}
              onChange={setPassword}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
            />
            {error && <p className="text-sm text-[var(--sp-coral)]">{error}</p>}
            <PrimaryCTA type="submit" className="w-full" disabled={loading}>
              {loading ? <Spinner /> : "Log in"}
            </PrimaryCTA>
          </form>

          <p className="mt-3 text-center text-sm">
            <Link to="/reset" className="font-medium text-[var(--sp-faint)] hover:text-[var(--sp-muted)]">
              Forgot your password?
            </Link>
          </p>

          <p className="mt-6 text-center text-sm text-[var(--sp-muted)]">
            New here?{" "}
            <Link to="/signup" className="font-semibold text-[var(--sp-aqua)] hover:underline">
              Create your profile
            </Link>
          </p>
          </div>
        </BorderGlow>
      </div>
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--sp-faint)]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-[var(--sp-line)] bg-white/[0.03] px-3.5 py-2.5 text-sm text-[var(--sp-ink)] placeholder:text-[var(--sp-faint)] transition focus:border-[var(--sp-coral)] focus:outline-none focus:ring-2 focus:ring-[var(--sp-coral)]/25"
      />
    </label>
  );
}
