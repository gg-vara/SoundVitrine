// The latest shout, then the next ones as they come (server-sent events)
import type { Shout } from './logic';

// without flooding a server that is restarting
const RETRY_DELAY_MS = 5000;

export function followShouts(onShout: (shout: Shout) => void): void {
  void fetch(clientURLShout).then(async response => {
    if (response.status === 200) onShout((await response.json()) as Shout);
  });

  const stream = new EventSource(shoutStreamUrl);
  stream.onmessage = event => onShout(JSON.parse(event.data) as Shout);
  stream.onerror = () => {
    stream.close();
    setTimeout(() => followShouts(onShout), RETRY_DELAY_MS);
  };
}
