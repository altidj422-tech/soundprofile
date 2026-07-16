# SoundProfile 🎸

**Find your next song to learn.** A social app for musicians: build a profile,
log the songs you can play, rate their difficulty, and get a TikTok-style feed
that recommends what to learn next — powered by musicians who play like you.

**Live:** https://soundprofile-app.higgsfield.app

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
- Built on Higgsfield's website builder; ships via its CI to Cloudflare.

## Run it locally

No accounts or keys needed — it runs on a local database:

```bash
bash run-local.sh
```

That builds the app, seeds a local D1 database (instruments, songs, a demo
community), and serves it at **http://localhost:8787**. First run installs
[Bun](https://bun.sh) + dependencies automatically.

## Project layout

```
app/
  src/routes/        # file-based routes (feed, profile, library, song, auth…)
  src/lib/api/       # server functions (auth, songs, catalog, recommend, tags…)
  src/components/sp/ # the SoundProfile UI kit
  migrations/        # D1 schema + seed data (additive)
```
