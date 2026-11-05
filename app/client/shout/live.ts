// The latest shout, then the next ones as they come (server-sent events), until the returned function is called
import { isShout, type Shout } from './logic';

export function followShouts(onShout: (shout: Shout) => void, onLost: () => void): () => void {
  const receive = (value: unknown) => {
    if (isShout(value)) onShout(value);
  };

  const latest = new AbortController();
  fetch(clientURLShout, { signal: latest.signal })
    .then(async response => {
      if (response.status === 200) receive(await response.json());
    })
    // the stream tells when the server is away
    .catch(() => {});

  const stream = new EventSource(shoutStreamUrl);
  stream.onmessage = event => receive(JSON.parse(event.data));
  stream.onerror = () => onLost();

  return () => {
    latest.abort();
    stream.close();
  };
}
