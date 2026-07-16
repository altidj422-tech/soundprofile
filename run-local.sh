#!/usr/bin/env bash
#
# Run SoundProfile locally — no Higgsfield, no internet deploy needed.
# Serves the real app (Cloudflare Worker via wrangler) with a local D1 database
# at http://localhost:8787
#
# Usage:  bash run-local.sh
#
set -euo pipefail

# Make bun available (installs it the first time if missing).
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
if ! command -v bun >/dev/null 2>&1; then
  echo "→ Installing bun (one-time)…"
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
fi

cd "$(dirname "$0")/app"

# Install deps the first time.
if [ ! -d node_modules ]; then
  echo "→ Installing dependencies (one-time)…"
  bun install
fi

echo "→ Building the app…"
bun run build

echo "→ Setting up the local database (schema + demo community)…"
for f in migrations/0001_init.sql migrations/0002_soundprofile.sql migrations/0003_seed.sql; do
  bunx wrangler d1 execute soundprofile-local --local --config wrangler.jsonc --file="$f" >/dev/null 2>&1 || true
done

echo ""
echo "════════════════════════════════════════════════════"
echo "  SoundProfile is running →  http://localhost:8787"
echo "  (Ctrl+C to stop)"
echo "════════════════════════════════════════════════════"
echo ""
exec bunx wrangler dev --port 8787 --config wrangler.jsonc
