// An album's cover, or what tells it is searched for or missing. What shows when there is none is in style.css, with its text
import { searchAlbumCover } from '../library/coverSearch';
import { play } from './motion';

export const COVER =
  'imgLoader rounded-[.5em] bg-white [transition:all_.3s_ease] [&_img]:h-full [&_img]:w-full [&_img]:rounded-[.5em] [&_img]:bg-white [&_img]:[transition:all_.3s_ease] [&::before]:absolute [&::before]:z-100 [&::before]:flex [&::before]:h-full [&::before]:w-full [&::before]:items-center [&::before]:justify-center [&::before]:rounded-[.5em] [&::before]:bg-white [&::before]:whitespace-pre [&::before]:text-[grey] [&::before]:[font-family:Verdana,Geneva,Tahoma,sans-serif] [&.searchingCover::before]:flex-col [&.searchingCover::before]:bg-[url(/public/images/loader.svg)] [&.searchingCover::before]:bg-[length:50%] [&.searchingCover::before]:bg-center [&.searchingCover::before]:bg-no-repeat [&.searchingCover::before]:[content:""]';

const FADE_SECONDS = 0.3;

// what tells it is searched for
const fadeSearch = (cover: Element) => play(cover, { opacity: [1, 0] }, FADE_SECONDS, { pseudoElement: '::before' });

async function showNoCover(cover: Element) {
  await fadeSearch(cover);
  cover.firstElementChild?.removeAttribute('src');
  cover.classList.remove('searchingCover');
  cover.classList.add('noImgFound');
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
    element.classList.remove('noImgFound');
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
