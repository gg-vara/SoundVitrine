// Moving around the page : what opens under the header, going down to something, and from a panel to the other

import { type AccountPanel, createAccountPanel } from './accountPanel';
import { waitTransitionEnd } from './waiting';

// what changes the height of something, null if it fits already
export type ApplyHeight = (() => void) | null;

export function resizeShutter(targetId: string, open: boolean): ApplyHeight {
  const target = document.getElementById(targetId) as HTMLElement;
  const height = open ? `${target.scrollHeight}px` : '';
  if (target.style.maxHeight === height) return null;

  return () => {
    window.requestAnimationFrame(() => {
      target.style.maxHeight = height;
    });
  };
}

// gives what opened or closed, null if nothing had to change
export async function toggleShutter(targetId: string, getHeight: () => ApplyHeight): Promise<Element | null> {
  return waitTransitionEnd(document.getElementById(targetId) as HTMLElement, getHeight());
}

// under the header, which stays
export function scrollToElement(element: Element | null, correction = 0) {
  if (!element) return;
  const header = document.getElementsByTagName('header')[0] as HTMLElement;
  window.scroll(0, element.getBoundingClientRect().top + window.scrollY + correction - header.offsetHeight);
}

// the button of the account panel, at the height of the library's. Measured from the header, as the page may be scrolled,
// and from what shows of the library's, which depends on the width of the page
export function alignConnectSideElements() {
  const headerTop = (document.getElementsByTagName('header')[0] as HTMLElement).getBoundingClientRect().top;
  const tops = [...document.querySelectorAll('#app-music-library .connect-side')]
    .filter(element => element.getClientRects().length)
    .map(element => element.getBoundingClientRect().top - headerTop);
  if (!tops.length) return;

  (document.querySelector('#app-connect .connect-side') as HTMLElement).style.top = `${Math.max(...tops)}px`;
}

let accountPanel: AccountPanel | undefined;

export function startAccountPanel() {
  accountPanel = createAccountPanel('xmlRLoader', '/account');
}

// as Hammer tells them : what is swiped left shows the panel on the right
const SWIPED_LEFT = 2;
const SWIPED_RIGHT = 4;

// null when it stays. With no direction, it goes from one to the other
export function nextPanel(current: number, direction: number | undefined, count: number): number | null {
  let target: number;
  if (direction === undefined) target = current ? 0 : 1;
  else if (direction === SWIPED_LEFT) target = current + 1;
  else if (direction === SWIPED_RIGHT) target = current - 1;
  else return null;

  return target === current || target < 0 || target >= count ? null : target;
}

const LIBRARY_PANEL = 0;
const ACCOUNT_PANEL = 1;

export function switchPanel(direction?: number) {
  const main = document.getElementsByTagName('main')[0] as HTMLElement;
  const target = nextPanel(Number(main.getAttribute('data-index')), direction, main.childElementCount);
  if (target === null) return;

  // the account panel never scrolls
  if (target === ACCOUNT_PANEL) document.body.classList.add('lock');

  main.setAttribute('data-index', String(target));
  window.scrollTo({ top: 0 });

  [...main.children].forEach((panel, index) => {
    panel.classList.toggle('focused', index === target);
  });

  // the background video only shows behind the account panel
  const video = document.getElementById('bg') as HTMLVideoElement;
  if (target !== LIBRARY_PANEL) void video.play();

  void waitTransitionEnd(main, () => {
    main.style.transform = `translateX(-${target * 100}%)`;
  })
    .then(alignConnectSideElements)
    .then(() => {
      if (target === LIBRARY_PANEL) video.pause();
      if (target === ACCOUNT_PANEL) void accountPanel?.reveal();
      else document.body.classList.remove('lock');
    });
}

const RESIZE_QUIET_MS = 250;

// a change of height alone is often the browser's bars coming and going
export function createResizeHandler(onWidthChange: (() => void)[], widthNow: () => number) {
  let width = widthNow();
  return () => {
    if (widthNow() === width) return;
    width = widthNow();
    for (const run of onWidthChange) run();
  };
}

// runs once things have been quiet for that long
export function debounced(run: () => void, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(run, ms);
  };
}

export function followResizing(onWidthChange: (() => void)[]) {
  const handle = createResizeHandler(onWidthChange, () => window.innerWidth);
  window.addEventListener('resize', debounced(handle, RESIZE_QUIET_MS));
  window.addEventListener('orientationchange', () => window.scrollTo({ left: 0 }));
}

export function followSwipes() {
  const swipes = new Hammer(document.body, { inputClass: Hammer.TouchInput });
  swipes.on('swipeleft swiperight', event => switchPanel(event.direction));
}
