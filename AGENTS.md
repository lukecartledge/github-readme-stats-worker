# github-readme-stats-worker — Agent Instructions

## Overview

Self-hosted GitHub readme stats SVG cards on Cloudflare Workers. Port of anuraghazra/github-readme-stats.

## Build & Dev

```sh
npm run dev       # wrangler dev (local Workers runtime)
npm run deploy    # wrangler deploy (production)
npm run test      # vitest
```

## Stack

- **Runtime**: Cloudflare Workers (ES modules)
- **Config**: `wrangler.toml`
- **SVG generation**: Pure string templates (no DOM, no canvas)
- **HTTP**: Native `fetch()` (no axios)
- **Caching**: Cache API (per-datacenter) + optional KV (global)
- **Auth**: GitHub PATs via Workers secrets (`GH_PAT_1`, `GH_PAT_2`, ...)

## Conventions

- **Upstream pin**: Ported from `anuraghazra/github-readme-stats@5df91f9`. Keep changes minimal to ease future upstream cherry-picks.
- **No dotenv**: Workers passes env via the `env` binding parameter. Thread `env` through function calls, never read `process.env` directly.
- **Stateless**: No server-side state. Caching is via Cache API / KV only.
- **Atomic commits**: Each commit does one thing. Message has no "and".

## File Structure

```
├── src/
│   ├── worker.js          # Entry point — fetch() handler, routing
│   ├── common/            # Shared utilities (Card, retryer, icons, utils)
│   ├── cards/             # SVG card renderers (stats, top-languages)
│   └── fetchers/          # GitHub API data fetchers
├── themes/                # Card theme definitions
├── wrangler.toml          # Workers config
├── .dev.vars.example      # Template for local secrets
```

## Environment Variables

Secrets (set via `wrangler secret put`):
```
GH_PAT_1    # GitHub PAT (required, scope: read:user, repo)
GH_PAT_2    # Optional additional PAT for rate-limit rotation
```

Config (set in wrangler.toml `[vars]`):
```
CACHE_MAX_AGE   # Cache TTL in seconds (default: 1800)
```

## Routes

```
/api?username=X                → Stats card
/api/top-langs?username=X      → Top languages card
```

## Do Not

- Add axios or any HTTP client library — use native `fetch()`
- Add dotenv — use Workers env bindings
- Read `process.env` directly — always pass `env` as a parameter
- Add DOM/canvas/JSDOM dependencies
- Suppress type errors with `as any` or `@ts-ignore`
- Commit `.dev.vars`
