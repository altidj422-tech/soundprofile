import { createFileRoute, Link } from "@tanstack/react-router";

import { Logo } from "../components/sp/ui";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-2xl px-5 py-8">
      <header className="mb-8 flex items-center justify-between">
        <Link to="/">
          <Logo />
        </Link>
        <Link to="/" className="text-sm font-medium text-[var(--sp-faint)] hover:text-[var(--sp-muted)]">
          ← Home
        </Link>
      </header>

      <article className="space-y-5 text-[15px] leading-relaxed text-[var(--sp-ink)]/90">
        <h1 className="font-display text-3xl font-bold text-[var(--sp-ink)]">Terms of Service</h1>
        <p className="text-sm text-[var(--sp-faint)]">Last updated: 18 July 2026</p>

        <p>By creating an account and using SoundProfile, you agree to these terms.</p>

        <Section title="Your account">
          <p>
            Keep your login details safe. You&apos;re responsible for activity on your account. Set
            up a recovery code in your profile so you can regain access if you forget your password.
          </p>
        </Section>

        <Section title="Community conduct">
          <p>Be a good bandmate. Don&apos;t post content that is:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>harassing, hateful, threatening, or abusive toward others;</li>
            <li>spam, scams, or misleading;</li>
            <li>illegal, or infringing someone else&apos;s rights.</li>
          </ul>
          <p>
            You can report content you believe breaks these rules. Trusted, high-reputation members
            help moderate, and we may remove content or restrict accounts that violate the rules.
          </p>
        </Section>

        <Section title="Content you add">
          <p>
            You keep ownership of what you post (tags, comments, notes), but you grant SoundProfile
            permission to display it within the app. Only share tutorial links you have the right to
            share — embedded videos remain the property of their creators and are governed by
            YouTube&apos;s terms.
          </p>
        </Section>

        <Section title="Difficulty ratings & tags">
          <p>
            Song difficulty is crowd-rated and technique tags are community-edited, so they reflect
            member opinions, not official guidance. Treat them as a helpful starting point.
          </p>
        </Section>

        <Section title="As-is service">
          <p>
            SoundProfile is provided &quot;as is,&quot; without warranties. We do our best to keep it
            running and your data safe, but we can&apos;t guarantee uninterrupted or error-free
            service.
          </p>
        </Section>

        <Section title="Termination">
          <p>
            You can stop using SoundProfile anytime. We may suspend or remove accounts that break
            these terms.
          </p>
        </Section>

        <Section title="Changes">
          <p>We may update these terms; continued use after a change means you accept the update.</p>
        </Section>

        <p className="border-t border-[var(--sp-line)] pt-5 text-sm text-[var(--sp-faint)]">
          <Link to="/privacy" className="text-[var(--sp-aqua)]">
            ← Read the Privacy Policy
          </Link>
        </p>
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-lg font-semibold text-[var(--sp-ink)]">{title}</h2>
      {children}
    </section>
  );
}
