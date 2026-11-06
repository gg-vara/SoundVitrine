// An album's cover, or what tells it is searched for or missing. What shows when there is none is in style.css, with its text
import { searchAlbumCover } from '../library/coverSearch';
import { waitTransitionEnd } from './waiting';

export const COVER =
  'imgLoader rounded-[.5em] bg-white [transition:all_.3s_ease] [&_img]:h-full [&_img]:w-full [&_img]:rounded-[.5em] [&_img]:bg-white [&_img]:[transition:all_.3s_ease] [&::before]:absolute [&::before]:z-100 [&::before]:flex [&::before]:h-full [&::before]:w-full [&::before]:items-center [&::before]:justify-center [&::before]:rounded-[.5em] [&::before]:bg-white [&::before]:whitespace-pre [&::before]:text-[grey] [&::before]:[font-family:Verdana,Geneva,Tahoma,sans-serif] [&::before]:[transition:all_.3s_ease] [&.searchingCover::before]:flex-col [&.searchingCover::before]:bg-[url(/public/images/loader.svg)] [&.searchingCover::before]:bg-[length:50%] [&.searchingCover::before]:bg-center [&.searchingCover::before]:bg-no-repeat [&.searchingCover::before]:[content:""] [&.fo::before]:opacity-0';

function showNoCover(cover: Element) {
  void waitTransitionEnd(cover, () => cover.classList.add('fo')).then(() => {
    cover.firstElementChild?.removeAttribute('src');
    cover.classList.remove('searchingCover', 'fo');
    cover.classList.add('noImgFound');
  });
}

const coverOf = (event: Event) => (event.currentTarget as Element).parentElement as Element;

export function onCoverLoaded(event: Event) {
  const cover = coverOf(event);
  void waitTransitionEnd(cover, () => cover.classList.add('fo')).then(() => {
    cover.classList.remove('searchingCover', 'fo');
  });
}

export function onCoverBroken(event: Event) {
  showNoCover(coverOf(event));
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
        if (current === asked) showNoCover(element);
      },
    );
  };
}
