// Moving around the page : what opens under the header, going down to something, and from a panel to the other
import { type AccountPanel, createAccountPanel } from './accountPanel';
import { nextPanel } from './panels';
import { createResizeHandler, debounced, type OnResize } from './resizing';
import { setHeaderClasses } from './scrolling';

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

const SCROLL_CHECK_MS = 100;
const SCROLL_LIMIT_MS = 2000;

export async function scrollToElement(element: Element | null, correction = 0): Promise<void> {
  if (!element) return;

  const destination = element.getBoundingClientRect().top + window.scrollY + correction;
  const arrived = () => destination === window.scrollY || document.body.scrollHeight === window.innerHeight;

  if (arrived()) {
    setHeaderClasses('sticky');
    return;
  }

  const header = document.getElementsByTagName('header')[0] as HTMLElement;
  const headerGone = waitTransitionEnd(header, () => setHeaderClasses('sticky toHide')).then(() => setHeaderClasses(''));

  const scrolled = new Promise<void>(resolve => {
    window.scroll(0, destination);

    let waited = 0;
    const checking = setInterval(() => {
      waited += SCROLL_CHECK_MS;
      if (arrived() || waited > SCROLL_LIMIT_MS) {
        clearInterval(checking);
        resolve();
      }
    }, SCROLL_CHECK_MS);
  });

  await Promise.all([headerGone, scrolled]);
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

export function followResizing(onResize: OnResize) {
  const handle = createResizeHandler(onResize, () => window.innerWidth);
  window.addEventListener('resize', debounced(handle, RESIZE_QUIET_MS));
  window.addEventListener('orientationchange', () => window.scrollTo({ left: 0 }));
}

export function followSwipes() {
  const swipes = new Hammer(document.body, { inputClass: Hammer.TouchInput });
  swipes.on('swipeleft swiperight', event => switchPanel(event.direction));
}
