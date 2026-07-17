import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { getMe } from "../lib/api/auth.functions";
import { resetPasswordWithCode } from "../lib/api/recovery.functions";
import { Logo, PrimaryCTA, Spinner } from "../components/sp/ui";
import BorderGlow from "../components/reactbits/BorderGlow";
import { Field } from "./login";

export const Route = createFileRoute("/reset")({
  beforeLoad: async () => {
    const { user } = await getMe();
    if (user) throw redirect({ to: "/discover" });
  },
  component: ResetPage,
});

function ResetPage() {
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await resetPasswordWithCode({ data: { username, code, newPassword: password } });
      if (!res.ok) {
        setError(res.error);
        setLoading(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
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
          Back to log in
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
            {done ? (
              <>
                <h1 className="font-display text-3xl font-bold">Password updated</h1>
                <p className="mt-2 text-sm text-[var(--sp-muted)]">
                  Your recovery code has been used up — generate a new one from your profile after
                  you sign in.
                </p>
                <Link to="/login">
                  <PrimaryCTA className="mt-6 w-full">Log in</PrimaryCTA>
                </Link>
              </>
            ) : (
              <>
                <h1 className="font-display text-3xl font-bold">Reset your password</h1>
                <p className="mt-2 text-sm text-[var(--sp-muted)]">
                  Enter your username and the recovery code you saved when you set up recovery.
                </p>

                <form onSubmit={onSubmit} className="mt-7 space-y-4">
                  <Field
                    label="Username or email"
                    value={username}
                    onChange={setUsername}
                    autoComplete="username"
                    placeholder="your username"
                  />
                  <Field
                    label="Recovery code"
                    value={code}
                    onChange={setCode}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                  />
                  <Field
                    label="New password"
                    value={password}
                    onChange={setPassword}
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                  />
                  {error && <p className="text-sm text-[var(--sp-coral)]">{error}</p>}
                  <PrimaryCTA type="submit" className="w-full" disabled={loading}>
                    {loading ? <Spinner /> : "Reset password"}
                  </PrimaryCTA>
                </form>

                <p className="mt-6 text-center text-sm text-[var(--sp-muted)]">
                  No recovery code?{" "}
                  <span className="text-[var(--sp-faint)]">
                    You&apos;ll need it to reset — set one up in your profile while you&apos;re
                    signed in.
                  </span>
                </p>
              </>
            )}
          </div>
        </BorderGlow>
      </div>
    </div>
  );
}
