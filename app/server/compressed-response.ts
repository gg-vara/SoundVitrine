// Compressing what is sent to browsers : a proxy may do it too, but no installation should need one

// not what is compressed already, nor text/event-stream, whose shouts must not wait in a buffer, nor text/plain : the replies
// SoundBuddy reads stay as they are
const COMPRESSIBLE = /^(text\/(html|css|javascript)|application\/(json|javascript|manifest\+json)|image\/svg\+xml)\b/;

// a smaller file would not gain from it
const MINIMUM_BYTES = 1024;

function acceptsGzip(request: Request): boolean {
  return (request.headers.get('accept-encoding') ?? '').split(',').some(encoding => {
    const [name, quality] = encoding.trim().split(';q=');
    return name?.trim().toLowerCase() === 'gzip' && quality !== '0' && quality !== '0.0' && quality !== '0.000';
  });
}

export function compressedResponse(request: Request, response: Response): Response {
  if (!COMPRESSIBLE.test(response.headers.get('content-type') ?? '')) return response;

  // whoever keeps a copy must know it depends on this, either way
  response.headers.append('vary', 'Accept-Encoding');

  const length = response.headers.get('content-length');
  const worthIt = length === null || Number(length) >= MINIMUM_BYTES;
  const whole = response.status === 200 && !request.headers.has('range') && !response.headers.has('content-encoding');
  if (request.method === 'HEAD' || !response.body || !whole || !worthIt || !acceptsGzip(request)) return response;

  response.headers.set('content-encoding', 'gzip');
  response.headers.delete('content-length');
  // the size browsers can no longer tell, for the loading bar of the library page (client/library/loader.ts)
  if (length !== null) response.headers.set('x-original-content-length', length);

  return new Response(response.body.pipeThrough(new CompressionStream('gzip')), { status: response.status, headers: response.headers });
}
