# SoundProfile 🎸

**Find your next song to learn.** A social app for musicians: build a profile,
log the songs you can play, rate their difficulty, and get a TikTok-style feed
that recommends what to learn next — powered by musicians who play like you.

**Deploy your own for free** in a few minutes — see [Deploy](#deploy-free-on-cloudflare).

---

## What it does

- **Profiles** — sign up, pick your instruments + skill level, write a bio.
- **Your songs** — search a real music catalog (Apple/iTunes) with album art +
  30-second previews, add songs, tag the instrument, and rate each one's
  difficulty (1–5).
- **Community difficulty** — every song shows an aggregated difficulty rating,
  broken down per instrument, plus who plays it.
- **Discovery feed** — a vertical, swipeable feed that recommends songs to learn
  using **collaborative filtering** (finds musicians whose repertoire +
  instruments overlap yours and surfaces what they play that you don't).
- **Technique tags + reputation** — a wiki-style, community-owned set of guitar
  techniques per song (slides, bends, barre chords, palm muting…). Vote 👍/👎;
  net-negative tag-sets unlock for anyone to rewrite. Likes build your
  reputation; trusted taggers can moderate, and abusive taggers get restricted.
- **Comments** — a discussion thread on every song.

## Stack

- **React 19 + TanStack Start** (SSR), deployed as a single **Cloudflare Worker**.
- **D1** (SQLite) for all persistence; cookie sessions with PBKDF2-hashed
  passwords (Web Crypto).
- Server logic in TanStack **server functions** (`app/src/lib/api/*`).
- Catalog search runs client-side via JSONP (Apple rate-limits shared server IPs).
- Self-hosted as a single Cloudflare Worker on the **free tier** (Workers + D1) —
  no paid plan, no API keys, no domain required. See [Deploy](#deploy-free-on-cloudflare).

## Run it locally

No accounts or keys needed — it runs on a local database:

```bash
bash run-local.sh
```

That builds the app, seeds a local D1 database (instruments, songs, a demo
community), and serves it at **http://localhost:8787**. First run installs
[Bun](https://bun.sh) + dependencies automatically.

## Deploy (free, on Cloudflare)

Everything runs on Cloudflare's **free tier** — Workers + D1. No paid plan, no
API keys, and no domain required (you get a free `*.workers.dev` URL). Song
search works immediately: it queries Apple's iTunes catalog from the browser.

From the `app/` folder:

```bash
bun install
bunx wrangler login          # opens a browser to authorize YOUR Cloudflare account
bun run d1:create            # creates the D1 database, prints a database_id
```

Paste the printed `database_id` into `app/wrangler.jsonc`, replacing
`REPLACE_WITH_D1_DATABASE_ID`. Then create the schema (+ demo community) and ship:

```bash
bun run d1:migrate           # applies migrations/ to the remote D1
bun run deploy               # builds and deploys the Worker
```

Your app is now live at `https://soundprofile.<your-account>.workers.dev`. To
ship updates later, just run `bun run deploy` again.

Want a custom name instead of `*.workers.dev`? Register a domain (~$10/yr — the
only thing that costs money) and attach it under the Worker's **Settings →
Domains & Routes**. Hosting stays free.

## Project layout

```
app/
  src/routes/        # file-based routes (feed, profile, library, song, auth…)
  src/lib/api/       # server functions (auth, songs, catalog, recommend, tags…)
  src/components/sp/ # the SoundProfile UI kit
  migrations/        # D1 schema + seed data (additive)
```
