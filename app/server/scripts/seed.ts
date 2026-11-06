// A server to try things on, from a known state rebuilt at each start : a test account, a generated library and a recent shout.
// It keeps to its own state folder (_state-dev), and never touches a real one

import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

const STATE = resolve(import.meta.dir, '../..', process.env.SEED_STATE ?? '_state-dev');
const USERNAME = 'testcurator';
const PASSWORD = 'testpassword';

// set before the server's modules read them
process.env.SOUNDVITRINE_STATE_PATH = STATE;
process.env.PORT = process.env.PORT ?? '3000';
process.env.ALLOW_SSE_TESTING = '1';
process.env.ENFORCE_CANONICAL_HTTP_SCHEME = '1';

rmSync(STATE, { recursive: true, force: true });

const { handle, prepareState } = await import('../app');
const { auth } = await import('../auth');
const { PORT } = await import('../config');
const { saveLatestShout, saveLibraryRecord } = await import('../db');
const { compileLibrary, libraryPath } = await import('../library');
const { updateProfile } = await import('../users');

// what real libraries hold, and tends to break things
const ARTISTS = ['Sigur Rós', 'AC/DC', 'Simon & Garfunkel', 'Björk', '!!!', '2Pac', 'Mötley Crüe', '坂本龍一', 'A', 'The "Quoted" Band'];
const GENRES = ['Rock', 'heavy metal', 'Électro', 'Jazz', '2000'];

// as a real library : about 12 tracks by album, and 4 albums by artist
const TRACKS_BY_ALBUM = 12;
const ALBUMS_BY_ARTIST = 4;

function generateTracks(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const album = Math.floor(index / TRACKS_BY_ALBUM);
    const artistIndex = Math.floor(album / ALBUMS_BY_ARTIST);
    const artist = ARTISTS[artistIndex] ?? `Artist ${artistIndex}`;
    return {
      Name: `Track ${index} é`,
      Album: `Album ${album} of ${artist}`,
      'Album Artist': artist,
      Genre: GENRES[artistIndex % GENRES.length],
      Year: 1970 + (album % 50),
      'Disc Number': 1,
      'Track Number': (index % TRACKS_BY_ALBUM) + 1,
      'Date Added': `20${10 + (album % 15)}-0${(album % 9) + 1}-01T00:00:00Z`,
    };
  });
}

await prepareState();
await auth.api.signUpEmail({ body: { name: USERNAME, username: USERNAME, password: PASSWORD, email: `${USERNAME}@example.com` } });
updateProfile(USERNAME, { customColors: ['#EE7752', '#E73C7E', '#23A6D5', '#23D5AB'] });
await prepareState();

const library = JSON.stringify(generateTracks(Number(process.env.SEED_TRACKS ?? 2000)));
await Bun.write(libraryPath(USERNAME), library);
await compileLibrary(USERNAME);
saveLibraryRecord(USERNAME, new Bun.CryptoHasher('sha1').update(library).digest('hex'));

saveLatestShout(
  USERNAME,
  JSON.stringify({
    date: new Date().toISOString(),
    name: 'Track 1 é',
    album: `Album 1 of ${ARTISTS[1]}`,
    artist: ARTISTS[1],
    genre: GENRES[1],
    duration: 215,
    playerPositionMS: 1200,
    playerState: true,
    year: 1971,
    md5: 'seed',
  }),
);

const server = Bun.serve({
  port: PORT,
  fetch: (request, connection) => handle(request, connection.requestIP(request)?.address),
  idleTimeout: 60,
});

console.log(`SoundVitrine listening on ${server.url}, seeded in ${STATE}
  account  : ${USERNAME} / ${PASSWORD}
  library  : ${server.url}u/${USERNAME}
  API      : ${server.url}api/docs
  shouts   : ${server.url}mock/sse`);
