// What an album's cover shows, on an element holding its image (shell/cover.ts styles these classes)

export function searchCover(cover: Element) {
  cover.firstElementChild?.removeAttribute('src');
  cover.classList.remove('noImgFound');
  cover.classList.add('searchingCover');
}

export function showCover(cover: Element, url: string) {
  cover.firstElementChild?.setAttribute('src', url);
}

export function showNoCover(cover: Element) {
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
