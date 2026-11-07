// An album's cover, or what tells it is searched for or missing (components.css)

import { play } from '../../shared/motion';
import { searchAlbumCover } from './search';

const FADE_SECONDS = 0.3;

// what tells it is searched for
const fadeSearch = (cover: Element) => play(cover, { opacity: [1, 0] }, FADE_SECONDS, { pseudoElement: '::before' });

async function showNoCover(cover: Element) {
  await fadeSearch(cover);
  cover.firstElementChild?.removeAttribute('src');
  cover.classList.remove('searchingCover');
  cover.classList.add('noCover');
}

const coverOf = (event: Event) => (event.currentTarget as Element).parentElement as Element;

export async function onCoverLoaded(event: Event) {
  const cover = coverOf(event);
  await fadeSearch(cover);
  cover.classList.remove('searchingCover');
}

export function onCoverBroken(event: Event) {
  void showNoCover(coverOf(event));
}

// shows on "cover" what is found for an album, nothing without one. A search under the same name cancels the previous one
export function createCoverFinder(searchName: string, cover: () => Element) {
  let asked = 0;
  return (album: string | undefined, artist: string | undefined) => {
    const current = ++asked;
    const element = cover();
    element.firstElementChild?.removeAttribute('src');
    element.classList.remove('noCover');
    element.classList.add('searchingCover');
    if (!album || !artist) return;

    searchAlbumCover(searchName, album, artist).then(
      url => {
        if (current === asked) element.firstElementChild?.setAttribute('src', url);
      },
      () => {
        if (current === asked) void showNoCover(element);
      },
    );
  };
}
