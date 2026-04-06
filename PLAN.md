# github-readme-stats-worker — Implementation Plan

## Goal

Self-host GitHub profile readme stats cards on Cloudflare Workers, replacing reliance on the shared `github-readme-stats.vercel.app` instance which is rate-limited and unreliable.

## Source

Fork/port of [anuraghazra/github-readme-stats](https://github.com/anuraghazra/github-readme-stats) (commit `5df91f9`).

## Cards to Support

| Card | Route | Current URL |
|---|---|---|
| Stats | `/api?username=X` | `github-readme-stats.vercel.app/api` |
| Top Languages | `/api/top-langs?username=X` | `github-readme-stats.vercel.app/api/top-langs/` |

**Out of scope (for now):** Streak stats (separate project: `github-readme-streak-stats`), repo pin cards.

## Architecture

```
Request → CF Workers fetch() handler
  ├─ Route matching (URL pathname)
  ├─ Cache check (Cache API → KV fallback)
  ├─ GitHub GraphQL API fetch (with PAT rotation)
  ├─ SVG string template rendering (from upstream Card.js)
  └─ Response with Cache-Control headers + async cache write
```

No DOM, no canvas, no SSR framework. Pure string template SVGs.

---

## Phases

### Phase 1: Core Port (MVP)

Port the minimum upstream code to serve stats + top-langs cards.

#### 1.1 — Copy upstream source files

Copy these directories/files from `anuraghazra/github-readme-stats@5df91f9`:

```
src/common/Card.js
src/common/I18n.js
src/common/blacklist.js
src/common/createProgressNode.js
src/common/icons.js
src/common/languageColors.json
src/common/retryer.js
src/common/utils.js
src/cards/stats-card.js
src/cards/top-languages-card.js
src/fetchers/stats-fetcher.js
src/fetchers/top-languages-fetcher.js
src/translations.js
themes/index.js
```

#### 1.2 — Replace axios with fetch()

The upstream uses `axios` for GitHub API calls. Workers has native `fetch()`.

**Files to change:** `src/common/retryer.js`, `src/fetchers/stats-fetcher.js`, `src/fetchers/top-languages-fetcher.js`

Pattern:
```js
// Before (axios)
const { data } = await axios.post(url, { query }, { headers });

// After (fetch)
const res = await fetch(url, {
  method: "POST",
  headers: { ...headers, "Content-Type": "application/json" },
  body: JSON.stringify({ query }),
});
const data = await res.json();
```

#### 1.3 — Remove dotenv, refactor env access

Upstream reads `process.env` at module scope for PAT rotation. Workers passes `env` as a parameter to `fetch()`.

**Changes:**
- Delete all `dotenv` imports
- Refactor `retryer.js` PAT discovery from `Object.keys(process.env).filter(key => /PAT_\d+/.test(key))` to accept `env` as a function parameter
- Thread `env` through: `worker.js` → fetcher → retryer

#### 1.4 — Write Workers entry point

```
src/worker.js — export default { fetch(request, env, ctx) {} }
```

- Parse URL pathname for routing (`/api`, `/api/top-langs`)
- Extract query params
- Call appropriate fetcher + card renderer
- Return SVG response with `Content-Type: image/svg+xml`
- Set `Cache-Control` headers

#### 1.5 — Basic error handling

- Invalid/missing `username` → 400 with error SVG
- GitHub API error → 500 with error SVG (matching upstream's error card style)
- Unknown route → 404 plain text

**Deliverable:** `wrangler dev` serves working stats + top-langs SVG cards.

---

### Phase 2: Caching

#### 2.1 — Cache API (per-datacenter)

Use `caches.default` for fast same-datacenter cache hits:

```js
const cache = caches.default;
let response = await cache.match(request);
if (response) return response;

// ... generate SVG ...

ctx.waitUntil(cache.put(request, response.clone()));
```

**Requires custom domain** — `*.workers.dev` doesn't support Cache API in production.

#### 2.2 — KV caching (global, optional)

Add KV namespace for cross-datacenter cache:
- Key: normalized URL path + query string
- Value: SVG string
- TTL: configurable via `CACHE_MAX_AGE` env var (default 1800s / 30min)

Only implement if Cache API alone isn't sufficient.

**Deliverable:** Subsequent requests within TTL return cached SVGs without hitting GitHub API.

---

### Phase 3: Deployment & DNS

#### 3.1 — Domain setup

- Add `stats.lukecartledge.com` as a custom domain in Cloudflare dashboard
- Or use Workers route on existing zone

#### 3.2 — Secrets

```sh
wrangler secret put GH_PAT_1
# Optional additional tokens for rate limit rotation:
wrangler secret put GH_PAT_2
```

GitHub PAT requirements:
- Classic token with `read:user` scope
- Add `repo` scope if `count_private=true`

#### 3.3 — Deploy

```sh
wrangler deploy
```

#### 3.4 — Update GitHub profile README

```markdown
![](https://stats.lukecartledge.com/api?username=lukecartledge&theme=gotham&hide_border=false&include_all_commits=true&count_private=true)
![](https://stats.lukecartledge.com/api/top-langs/?username=lukecartledge&theme=gotham&hide_border=false&include_all_commits=true&count_private=true&layout=compact)
```

**Deliverable:** Live, self-hosted stats cards on your own domain.

---

### Phase 4: Stretch Goals (optional)

- [ ] Add streak stats (port from `github-readme-streak-stats` or build minimal version)
- [ ] Add repo pin card support
- [ ] Add health check endpoint (`/health`)
- [ ] Add request logging via Workers Analytics
- [ ] Customize card themes / add personal branding

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Copy vs fork | Copy specific files | Upstream has 50+ files we don't need. Copying ~15 files keeps the project lean and avoids carrying test infra, CI config, Vercel-specific code. |
| axios replacement | Native `fetch()` | Zero dependencies, native to Workers runtime. |
| Caching layer | Cache API + optional KV | Cache API is free and fast. KV adds global replication if needed. |
| Plan | Free tier first | 10ms CPU is tight but string SVGs should fit. Upgrade to $5/mo paid if needed. |
| TypeScript | No (stay JS) | Upstream is JS. Porting to TS adds scope without value for this project. |

## Risks

| Risk | Mitigation |
|---|---|
| Free tier 10ms CPU limit too tight | Monitor with `wrangler tail`. Upgrade to paid ($5/mo) if needed. |
| GitHub API rate limits | PAT rotation support (upstream pattern). Multiple tokens spread load. |
| Upstream breaking changes | Pin to specific commit (`5df91f9`). Manual updates only. |
| Cache API requires custom domain | Set up `stats.lukecartledge.com` in Phase 3. Use `*.workers.dev` for dev. |

## Estimated Effort

| Phase | Effort |
|---|---|
| Phase 1 (MVP) | 2-3 hours |
| Phase 2 (Caching) | 1 hour |
| Phase 3 (Deploy) | 30 min |
| Phase 4 (Stretch) | Variable |
| **Total MVP** | **~4 hours** |
