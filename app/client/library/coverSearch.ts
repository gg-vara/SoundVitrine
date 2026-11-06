// Finding an album's cover, on MusicBrainz and the Cover Art Archive
const SEARCH_URL = 'https://musicbrainz.org/ws/2/release-group/?limit=1&fmt=json&query=';

export const coverSearchUrl = (album: string, artist: string) =>
  SEARCH_URL + encodeURIComponent(`release:${album.toLowerCase()} AND artist:${artist.toLowerCase()}`);

// an error from the service (it limits its callers) has another shape, or is no JSON at all
export function coverInAnswer(answer: string): string | undefined {
  let groups: unknown;
  try {
    groups = JSON.parse(answer)['release-groups'];
  } catch {
    return undefined;
  }
  const id = Array.isArray(groups) ? groups[0]?.id : undefined;
  return id ? `https://coverartarchive.org/release-group/${id}/front-250` : undefined;
}

const searches = new Map<string, AbortController>();

// a new search under the same name cancels the previous one, which then fails
export async function searchAlbumCover(name: string, album: string, artist: string): Promise<string> {
  searches.get(name)?.abort();
  const controller = new AbortController();
  searches.set(name, controller);

  if (!album || !artist) throw new Error('A cover is searched from an album and its artist');

  const response = await fetch(coverSearchUrl(album, artist), { signal: controller.signal });
  const cover = coverInAnswer(await response.text());
  if (!cover) throw new Error(`No cover found for ${album}`);
  return cover;
}
