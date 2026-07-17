import { createFileRoute, Link } from "@tanstack/react-router";

import { Logo } from "../components/sp/ui";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
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
        <h1 className="font-display text-3xl font-bold text-[var(--sp-ink)]">Privacy Policy</h1>
        <p className="text-sm text-[var(--sp-faint)]">Last updated: 18 July 2026</p>

        <p>
          SoundProfile is a community for musicians to track songs they can play and discover new
          ones. This policy explains what we collect and how we use it. It&apos;s written to be
          plain and honest.
        </p>

        <Section title="What we collect">
          <ul className="list-disc space-y-1 pl-5">
            <li>Account details you provide: email, username, display name, and a password (stored only as a salted hash — never in plain text).</li>
            <li>Profile content you add: an optional bio and avatar photo, the instruments you play, the songs in your set, difficulty ratings, technique tags, comments, tutorial links, and friend connections.</li>
            <li>A single sign-in cookie so we can keep you logged in.</li>
          </ul>
        </Section>

        <Section title="How we use it">
          <p>
            To run the app — sign you in, build your recommendation feed, show your profile, and
            power the social features. We do not sell your personal data, and we don&apos;t use it
            for advertising.
          </p>
        </Section>

        <Section title="What&apos;s visible to others">
          <p>
            Your profile, instruments, songs, ratings, tags, comments, and friend connections are
            visible to other signed-in members. Your email and password are never shown to anyone.
          </p>
        </Section>

        <Section title="Third parties">
          <ul className="list-disc space-y-1 pl-5">
            <li>Album art and 30-second song previews come from Apple&apos;s public iTunes catalog.</li>
            <li>Tutorials are embedded YouTube players; when you play one, YouTube may set its own cookies under its own privacy policy.</li>
            <li>The app is hosted on Higgsfield / Cloudflare infrastructure, which processes requests to serve the site.</li>
          </ul>
        </Section>

        <Section title="Your data">
          <p>
            You can edit your profile and remove songs, tags, comments, and tutorials at any time.
            To delete your account and its data entirely, contact the site owner and we&apos;ll
            remove it.
          </p>
        </Section>

        <Section title="Children">
          <p>SoundProfile isn&apos;t directed at children under 13, and we don&apos;t knowingly collect their data.</p>
        </Section>

        <Section title="Changes">
          <p>We may update this policy; we&apos;ll change the date above when we do.</p>
        </Section>

        <p className="border-t border-[var(--sp-line)] pt-5 text-sm text-[var(--sp-faint)]">
          Questions about your data? Reach out to the site owner.{" "}
          <Link to="/terms" className="text-[var(--sp-aqua)]">
            Read the Terms of Service →
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
