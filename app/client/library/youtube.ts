// Where to listen to something
export function youtubeSearchUrl(artist: string, albumOrTitle: string): string {
  const search = `${artist} ${albumOrTitle}`.replaceAll('  ', ' ').toLowerCase();
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(search).replaceAll('%20', '+')}`;
}
