<div align="center">
  <img width="255" height="122" alt="chrome_lGfrjGSkwT" src="https://github.com/user-attachments/assets/ba90986d-70a6-49c5-a964-5dba962026c9" />
</div>

# SoundVitrine
[![CodeFactor](https://www.codefactor.io/repository/github/amphaal/soundvitrine/badge)](https://www.codefactor.io/repository/github/amphaal/soundvitrine)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/8960843e3cd94a3c903b5ec54829ec41)](https://app.codacy.com/gh/Amphaal/SoundVitrine/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/Amphaal/SoundVitrine/build-image.yml)
![GitHub Release](https://img.shields.io/github/v/release/amphaal/SoundVitrine)


SoundVitrine is a web-app that hosts your local music library metadata. **It's kinda like a reverse Spotify** !

- Using [SoundBuddy](https://github.com/Amphaal/SoundBuddy) - its app counterpart - you can securely publish your 10k+ tunes library online in a matter of milliseconds⚡
- Thanks to HTTP's [SSE](https://en.wikipedia.org/wiki/Server-sent_events), watch in real-time what the vitrine's curator is listening to, live from iTunes 🤯

## About
This personal project is quite old, and started as an idea back in 2018.

As a music enthusiast, I always had tons and tons of new music that I downloaded regularly on my computer, and liked having them tightly ordered, with album covers. 

Back then, music pure player like Deezer or Spotify did not have a complete enough library (especially considering my music tastes !) to justify switching to those, so I kept my iTunes library growing.

As I always wanted to tell about my discoveries to my friends when I was outside but frequently forgot about band names and titles, I thought about building what became **SoundVitrine** !

<div align="center">
  <i>As of 2025, I ended up with a massive library (almost 30k, 240+ Go)</i>
  <img width="842" height="583" alt="iTunes_4SCc9oybOx" src="https://github.com/user-attachments/assets/a6a48622-3fbe-4896-8083-1b885f521dec" />
</div>

## Features Tour
- Slick, responsive design
- Internationalization (French and English)
- Band Searching, upload history and statistics features
- Basic, password & username account feature
- Genre / Artists / Album unified navigation
- Automatic fetching of album covers, thanks to [MusicBrainz Picard](https://picard.musicbrainz.org/)
- Responsively display account owner's currently listened-to music (including track-jumping, play/resume events !)
- Short links to [Youtube](https://www.youtube.com/) on listened tunes / searched albums to listen to the music yourself

## Technologies used
> [!NOTE]
> The legacy technologies / techniques that are used on this Proof-of-Concept project are not par with industry standards - refactorization efforts are welcome https://github.com/Amphaal/SoundVitrine/issues/14 !

- Plain old HTML5 + CSS3 animations (w/ [animate.css](https://animate.style/) & [FontAwesome](https://fontawesome.com/))
- [TypeScript](https://www.typescriptlang.org/) on [Bun](https://bun.sh/), with [oRPC](https://orpc.dev/) for the API, its OpenAPI document and live shouts, and [Biome](https://biomejs.dev/) for lint and format
- [Scalar](https://scalar.com/), to browse the API
- Vanilla Javascript, alongside 
    - [Chart.js](https://www.chartjs.org/) for graphs
    - [Hammer.js](https://hammerjs.github.io/) for gesture handling
    - [Moment.js](https://momentjs.com/) for time
- MusicBrainz API (https://musicbrainz.org/doc/MusicBrainz_API)

## Using SoundVitrine
> [!TIP]
> - Using [Visual Studio Code](https://code.visualstudio.com/) is strongly advised, and we assume you are using it in this documentation. Some extensions will also be automatically recommended to you to ease debuging and coding.
> - We also assume you are familiar with `git` and have cloned the repo on your machine. 
> - Being familiar with `docker` and `docker-compose.yml` file format is also highly recommanded if you wish to deploy the app yourself.

### Debugging / Using locally
- In the `Execute and Debug` VSCode's left panel, please run `1) Run - Docker Compose` configuration.
    - It will require a docker image build, so it might take a few seconds the first time you run it; please wait !
- Once you notice `SoundVitrine listening` in `1) Run - Docker Compose`'s terminal log, you can run `2) Open SoundVitrine locally` to launch the app.

You can also run it without Docker : from `app/`, `bun install`, then `PORT=3000 bun run dev`. `bun test`, `bun run typecheck` and `bun run lint` check the code. `bun run dev:seed` starts a server to try things on, from a known state rebuilt at each start : a test account, a generated library and a recent shout (see `CLAUDE.md`).

### API
What [SoundBuddy](https://github.com/gg-vara/SoundBuddy) calls, and the live shouts of a user, are described by an OpenAPI document (`/api/openapi.json`), which you can browse and try at `/api/docs`.

### Hosting / Deploying
Since the app is self-contained, hosting is quite simple. Check https://github.com/Amphaal/SoundVitrine/tree/main/.dev/docker-compose.prod-example.yml for a non-debug configuration example. No secret needs configuring : HTTPS is expected from the proxy in front of it, and state lives in the `SOUNDVITRINE_STATE_PATH` volume : a SQLite database (`soundvitrine.db`), and a folder per user with its library and picture. Set `SOUNDVITRINE_TRUST_PROXY=1` behind a proxy, so that failed logins are counted by client.

## Screenshots
<div align="center">
  <b>Logged in<b/>
  <br/><br/>
  <img width="958" height="910" alt="chrome_Jk64BZXJBn" src="https://github.com/user-attachments/assets/64bd3f7b-306d-47f5-ac7c-3e64fa90a0e5" />
  <hr/>
  <b>Live music updates</b>
  <br/><br/>
  <img width="958" height="910" alt="chrome_Nq3wNWpxPt" src="https://github.com/user-attachments/assets/09ec0d26-d29c-43e4-b7e5-1293663de34d" />
  <hr/>
  <b>Responsive design</b>
  <br/><br/>
  <img width="479" height="900" alt="chrome_UeKzQscfD3" src="https://github.com/user-attachments/assets/8f4a5733-9a1b-4171-bf16-6ae442564d60" />
  <hr/>
  <b>Statistics about your library</b>
  <br/><br/>
  <img width="490" height="745" alt="chrome_CQH1esygKz" src="https://github.com/user-attachments/assets/16bed307-1db3-4ec7-bdae-63324c363d5c" />
  <hr/>
  <b>Show upload history, click on listened track to go to Youtube</b>
  <br/><br/>
  <img width="935" height="848" alt="chrome_FpES9IGgls" src="https://github.com/user-attachments/assets/128d7077-9b5d-44d6-9a0c-6fa589306e6c" />
  <hr/>
  <b>Search bands</b>
  <br/><br/>
  <img width="464" height="306" alt="chrome_9K6v6hh2Rs" src="https://github.com/user-attachments/assets/fac151d8-19c2-4786-98c9-7b336a388b9b" />
  <hr/>
  <b>Explore albums metadata</b>
  <br/><br/>
  <img width="1884" height="748" alt="chrome_In0HcYoPEs" src="https://github.com/user-attachments/assets/d356666f-37ac-4a92-9320-bf1119aa72a6" />
</div>

