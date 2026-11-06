// SoundVitrine's server

import { handle, prepareState } from './app';
import { PORT, STATE_FOLDER_PATH } from './config';

await prepareState();

const server = Bun.serve({
  port: PORT,
  fetch: (request, server) => handle(request, server.requestIP(request)?.address),
  // seconds : live shouts stay open, kept alive by a comment every few seconds
  idleTimeout: 60,
  // libraries are uploaded at once
  maxRequestBodySize: 512 * 1024 * 1024,
});

console.log(`SoundVitrine listening on ${server.url}, state in ${STATE_FOLDER_PATH}`);
