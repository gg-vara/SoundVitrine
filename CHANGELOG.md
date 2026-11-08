# Changelog

Each section becomes the notes of its GitHub release. Versions are shared with [SoundBuddy](https://github.com/gg-vara/SoundBuddy) from 0.13.0 on. Before that, see the tags.

## 0.14.2

Nothing changes for SoundBuddy : the API's description is the same. Numbered as SoundBuddy 0.14.2, which it pairs with.

### New

- SoundVitrine can run as a single executable, which takes its pages and files along : `bun run build:binary`

### Changed

- The server's routing and pages are written with Hono, whose templates escape what they show
- Images have a text alternative, and the GitHub link of the upload page opens without giving the new tab a hold on this one

### Removed

- The test page for shouts (`/mock/sse`) : the API's reference sends them, logged in (`/api/docs`, `POST /api/v1/me/shouts`)

## 0.14.0

Nothing changes for visitors, nor for SoundBuddy : the API's description is the same.

### Changed

- The code is organized by page in the browser and by area on the server
- Each source file carries its license, which the README also states

## 0.13.0

> **A new install, not an upgrade** : accounts and libraries of the PHP versions are not carried over. Accounts are created again, and libraries uploaded again from SoundBuddy.

SoundVitrine is rewritten : no more PHP nor Mercure, a single Bun server with its database, and a new frontend.

### New

- Applications log in with OAuth (`POST /oauth/token`, password and refresh grants, `POST /oauth/revoke`), and use tokens instead of sending a password with each call. SoundBuddy 0.13 does
- `/api/v1` : `GET /api/v1/me`, `PUT /api/v1/me/library` and `POST /api/v1/me/shouts`, with Bearer tokens, scopes, and errors as `application/problem+json`
- The API is described by OpenAPI (`/api/openapi.json`) and can be tried at `/api/docs`, with its Authorize button. The footer and the welcome page link to it
- The discover panel works with the keyboard, and Escape closes its lists
- When a library cannot be loaded, the page says so and offers to try again

### Changed

- Passwords are stored hashed, and too many failed attempts block that client on that account
- The library page and account pages are rebuilt with Solid, Vite and Tailwind. Pages are lighter, and the background video only downloads when the account panel opens : a poster first, then a small copy, then the full one
- The header stays at the top while scrolling, rather than hiding and coming back
- The scrollbar of the library page always shows, so the layout no longer shifts
- Relative dates come from the browser : "1 year ago" rather than "a year ago", and "now" for what is under 45 seconds old
- Statistics are drawn with Chart.js, downloaded only when the panel first opens
- Artist search finds names in any script

### Fixed

- A stored XSS : names of tracks, albums and artists from an uploaded library could run scripts in visitors' browsers
- Profile pictures only accept images, as other files served from this origin could run scripts
- Changing a profile picture for one of the same type now shows at once
- A panel closed while opening, or a window resized meanwhile, no longer ends at the wrong height
- The band's color pickers no longer cover its validate button on the account page

### For SoundBuddy

Released versions keep working : `POST /hb/creds`, `/u/{user}/uploadMusicLibrary` and `/u/{user}/uploadShout` are unchanged. SoundBuddy 0.13 requires this version, for `/oauth` and `/api/v1`.
