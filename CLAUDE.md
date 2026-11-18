# SoundVitrine

Web app hosting a music library's metadata, fed by [SoundBuddy](https://github.com/gg-vara/SoundBuddy), with what its owner is listening to, live. TypeScript on Bun, in `app/`. See `README.md` for the details.

## Commands

From `app/` :

```bash
bun run dev:seed
```

A server to try things on, at http://localhost:3000 : rebuilt from nothing at each start, in `_state-dev`, with the account `testcurator` / `testpassword`, a generated library and a recent shout. `SEED_TRACKS=30000` makes the library larger, `PORT` moves it. `/api/docs` browses the API : its Authorize button logs in, and `POST /api/v1/me/shouts` sends a shout the library page shows live. It builds the browser code first : `bun run dev:client` rebuilds it as it changes, and a reload shows it.

- `bun test`, `bun run typecheck`, `bun x biome check --write .`, `bun run build` : what CI checks (`biome ci`)
- `bun run test:e2e` : the real pages in a real browser (Playwright, `e2e/`), on a seeded server of their own. It uses the installed Chrome, CI a downloaded Chromium
- never point these at a real state folder : tests and seed keep to temporary ones
- in a browser : the library page starts once a CSS transition ends, which a hidden tab or pane delays for as long as it stays hidden. Not a slow library : check that the tab is visible before measuring anything

The image, with Podman (or Docker) :

```bash
podman build --format docker -t soundvitrine:test app
```

```bash
podman run -d --name sv-test -p 3103:80 -e ENFORCE_CANONICAL_HTTP_SCHEME=1 -e SOUNDVITRINE_PUBLIC_URL=http://localhost:3103 -v sv-test-state:/app/_state:rw soundvitrine:test
```

Without `--format docker`, Podman drops the health check. On WSL, Podman's networking needs WSL 2.7.5 or newer, whose kernel has `nft_fib_inet`.

## Structure

Server :

- `server/app.ts` : routing, on Hono : middleware for static files, the API (oRPC, which reads the body first) and what the pages are rendered from, then the routes. `server/static.ts` the files served as they are, `server/account.ts` the account routes, mounted at `/account`. `server/env.ts` what the routes share; `plain()` says the type of plain text, which Bun only adds when sending
- `server/api/` : the API, in oRPC, from which the OpenAPI document comes (`/api/openapi.json`). `router.ts` gathers it, with its errors as RFC 9457 tells them. `v1.ts` has `/api/v1` : a Bearer access token, its scopes
- `server/auth/` : `auth.ts` is Better Auth, whose HTTP routes are closed on purpose, the forms call it directly. Only OAuth's are open (`/api/auth/oauth2/*`, its oauth-provider plugin) : applications log in through the browser, with PKCE, on our pages (`server/oauth.ts`, at `/oauth/login` and `/oauth/consent`), and get access tokens for `/api/v1` as JWTs, which `access.ts` verifies with the server's own keys. `scopes.ts` what they may ask. `rate-limit.ts` the failed passwords, by client and account
- `SOUNDVITRINE_PUBLIC_URL` : the address browsers use, `http://localhost:<PORT>` by default. Better Auth, the upload form and the tokens' audience rely on it : requests from another origin are refused
- `server/library/` : what becomes of an uploaded library, and the live shouts
- `server/pages/` : a file by page rendered by the server, in `hono/jsx`, on `layout.tsx`. It escapes what it interpolates : only `dangerouslySetInnerHTML` takes HTML as it is, for trusted texts, scripts and styles (`Script`, `Style`). they go through `c.render()`, whose `jsxRenderer` (`renderPages`) writes the doctype JSX cannot
- `server/i18n/` : the two languages
- `server/db.ts` : SQLite, in the state folder. Libraries and pictures stay files, under `users/<name>/`, served at `/data/users/`
- `server/compressed-response.ts` : gzip for browsers. Never live shouts

Browser, on Vite 8, Solid and Tailwind, built to `client/dist/` by `bun run build`, served at `/web/` :

- `client/library/` : the library page. `main.tsx` is its entry, `LibraryPage.tsx` its layout (the server only sends the loader, the data as JSON and the footer in a template), `background.ts` loads the background video in stages (poster, `bg-480.webm`, `bg.mp4`). A folder by panel : `shout/` (`machine.ts` is its XState machine, given what touches the page as "effects" so that `bun test` runs it), `search/`, `feed/`, `discover/`, `stats/` (Chart.js only downloaded when the panel first opens). `data/` is what the panels show of a library (`search.ts` finds artists in any script, without the server's slugs : only their order is used), `cover/` the album covers
- `client/account/` : the account page and panel, from the JSON of `/account/*`, with its own entry (`main.tsx`) when it stands alone
- `client/shared/` : what both use. In `motion.ts`, what waits for an animation needs a time limit : its end never comes in a hidden tab
- `client/styles/` : `index.css` says why there are no layers nor reset, and what Tailwind scans : a new folder must be added there. `base.css` holds what every page relies on, the others are by feature
- `client/page-globals.d.ts` : what the page defines before its scripts
- `client/public/` : static files, served at `/public/`
- `server/embedded.ts` : written by Vite's build (a plugin in `vite.config.ts`). It imports every file the server serves of the application, so that `bun run build:binary` makes a single executable that takes them along, and tells the pages the files of each entry. The server reads nothing else next to its code : only the state folder, from `SOUNDVITRINE_STATE_PATH` or `_state` in the current folder. `e2e/binary-smoke.ts` checks the executable (`bun run test:binary`)

## What must not break

SoundBuddy logs in through the browser, as the client `soundbuddy` : public, with PKCE, its redirect on `http://127.0.0.1` at any port (RFC 8252), asking for `/api/v1` as its resource (RFC 8707). It then calls `/api/v1`, and refreshes its tokens. `server/tests/oauth-flow.test.ts` and `server/tests/api-v1.test.ts` do the same.

Bun's form parser ignores the `Content-Type` of a file, deducing one from its name : uploads are told apart by their content.

Library and shout values come from what any account uploads, and run in its visitors' browsers : browser scripts write them with `textContent`, never `innerHTML` (`server/tests/browser-scripts.test.ts`).

## Conventions

- Push or publish only when asked. Several small commits rather than one large one, messages in lowercase, saying what changed
- Comments say why, in the style of the surrounding code
- Each source file starts with the license reminder (SPDX), as the others do
- The version in `app/package.json` triggers the image's publication on `main`, with the notes of its section of `CHANGELOG.md`. Versions are shared with SoundBuddy
- Each text the pages show goes in `server/i18n/`, in both languages
