# SoundVitrine

Web app hosting a music library's metadata, fed by [SoundBuddy](https://github.com/gg-vara/SoundBuddy), with what its owner is listening to, live. TypeScript on Bun, in `app/`. See `README.md` for the details.

## Commands

From `app/` :

```bash
bun run dev:seed
```

A server to try things on, at http://localhost:3000 : rebuilt from nothing at each start, in `_state-dev`, with the account `testcurator` / `testpassword`, a generated library and a recent shout. `SEED_TRACKS=30000` makes the library larger, `PORT` moves it. `/api/docs` browses the API, `/mock/sse` sends test shouts. It builds the browser code first : `bun run dev:client` rebuilds it as it changes, and a reload shows it.

- `bun test`, `bun run typecheck`, `bun x biome check --write .`, `bun run build` : what CI checks (`biome ci`)
- never point these at a real state folder : tests and seed keep to temporary ones
- in a browser : the library page starts once a CSS transition ends, which a hidden tab or pane delays for as long as it stays hidden. Not a slow library : check that the tab is visible before measuring anything

The image, with Podman (or Docker) :

```bash
podman build --format docker -t soundvitrine:test app
```

```bash
podman run -d --name sv-test -p 3103:80 -e ENFORCE_CANONICAL_HTTP_SCHEME=1 -v sv-test-state:/app/_state:rw soundvitrine:test
```

Without `--format docker`, Podman drops the health check. On WSL, Podman's networking needs WSL 2.7.5 or newer, whose kernel has `nft_fib_inet`.

## Structure

- `server/api.ts` : the API, in oRPC, from which the OpenAPI document comes (`/api/openapi.json`)
- `server/app.ts` : routing, the account pages' logic, static files
- `server/pages/` : HTML templates. `server/html.ts` escapes what `html` interpolates : `raw()` only takes what is trusted
- `client/legacy/` : the last styles to move, inlined into the pages. `client/public/` : static files, served at `/public/`
- `client/` : what moved to Vite 8, Solid and Tailwind (`client/style.css` says why it has no layers nor reset, and what it scans : a new folder must be added there), built to `client/dist/` by `bun run build`, served at `/web/`. `client/main.tsx` is the library page's entry, `client/account/main.ts` the one of the account page standing alone, `client/account/` its editors, `client/shout/` the shout panel, `client/search/` the search bar, `client/feed/` the latest albums, `client/stats/` the pies, with Chart.js only downloaded when the panel first opens, and `client/library/data.ts` what the panels show of a library. `client/shell/waiting.ts` waits for CSS transitions. `client/legacy.d.ts` lists the globals of the page's own scripts. `client/library/search.ts` finds artists in any script, without the server's slugs : only their order is used `client/shout/machine.ts` is its XState machine, given what touches the page as "effects" so that `bun test` runs it. What waits for a CSS transition needs a time limit : its end never comes in a hidden tab
- `server/auth.ts` : Better Auth. Its HTTP routes are closed on purpose, the forms call it directly
- `server/db.ts` : SQLite, in the state folder. Libraries and pictures stay files, under `users/<name>/`, served at `/data/users/`
- `server/rate-limit.ts` : failed passwords, by client and account
- `server/compressed-response.ts` : gzip for browsers. Never live shouts, nor the plain text SoundBuddy reads

## What must not break

Released SoundBuddy versions call `POST /hb/creds`, `/u/{user}/uploadMusicLibrary` and `/u/{user}/uploadShout`, with multipart forms and the password each time. They show the plain text answers to their users, and stop trying on a 403. `server/tests/app.test.ts` sends the same bytes.

Bun's form parser ignores the `Content-Type` of a file, deducing one from its name : uploads are told apart by their content.

Library and shout values come from what any account uploads, and run in its visitors' browsers : browser scripts write them with `textContent`, never `innerHTML` (`server/tests/browser-scripts.test.ts`).

## Conventions

- Push or publish only when asked. Several small commits rather than one large one, messages in lowercase, saying what changed
- Comments say why, in the style of the surrounding code
- The version in `app/package.json` triggers the image's publication on `main`
- Each text the pages show goes in `server/translations/`, in both languages
