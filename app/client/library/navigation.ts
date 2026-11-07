// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// Moving around the page : what opens under the header, going down to something, and from a panel to the other

import { play } from '../shared/motion';
import { pauseBackground, playBackground } from './background';

const SHUTTER_SECONDS = 0.3;

const shutterHeight = (target: HTMLElement, open: boolean) => (open ? `${target.scrollHeight}px` : '');

// what each one was last asked to be : it can be asked again while it moves
const shutters = new Map<Element, string>();

// opens or closes what is under the header, giving it once done, null if nothing had to change
export async function setShutter(targetId: string, open: boolean): Promise<Element | null> {
  const target = document.getElementById(targetId) as HTMLElement;
  const height = shutterHeight(target, open);
  if ((shutters.get(target) ?? '') === height) return null;

  const from = `${target.clientHeight}px`;
  shutters.set(target, height);
  target.style.maxHeight = height;
  await play(target, { maxHeight: [from, height || '0px'] }, SHUTTER_SECONDS);
  if (shutters.get(target) === height) target.style.maxHeight = height;
  return target;
}

// to what it now holds, at once
export function fitShutter(targetId: string, open: boolean) {
  const target = document.getElementById(targetId) as HTMLElement;
  // what it was going to would be written back when it ends
  for (const animation of target.getAnimations()) animation.cancel();
  const height = shutterHeight(target, open);
  shutters.set(target, height);
  target.style.maxHeight = height;
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
  const tops = [...document.querySelectorAll('#libraryPanel .connectButton')]
    .filter(element => element.getClientRects().length)
    .map(element => element.getBoundingClientRect().top - headerTop);
  if (!tops.length) return;

  (document.querySelector('#accountPanel .connectButton') as HTMLElement).style.top = `${Math.max(...tops)}px`;
}

let onAccountPanelShown: (() => void) | undefined;

export function followAccountPanel(shown: () => void) {
  onAccountPanelShown = shown;
}

export type Swipe = 'left' | 'right';

// a finger moved fast enough along the page, far enough : what scrolls moves mostly across
const SWIPE_MIN_PX = 10;
const SWIPE_MIN_PX_PER_MS = 0.3;

export function swipeOf(movedX: number, movedY: number, ms: number): Swipe | null {
  const distance = Math.abs(movedX);
  if (distance < SWIPE_MIN_PX || distance <= Math.abs(movedY) || distance / ms < SWIPE_MIN_PX_PER_MS) return null;
  return movedX < 0 ? 'left' : 'right';
}

// null when it stays : what is swiped left shows the panel on the right. With no swipe, it goes from one to the other
export function nextPanel(current: number, swipe: Swipe | undefined, count: number): number | null {
  let target: number;
  if (swipe === undefined) target = current ? 0 : 1;
  else target = swipe === 'left' ? current + 1 : current - 1;

  return target === current || target < 0 || target >= count ? null : target;
}

const PANEL_SECONDS = 0.5;
const LIBRARY_PANEL = 0;
const ACCOUNT_PANEL = 1;

export function switchPanel(swipe?: Swipe) {
  const main = document.getElementsByTagName('main')[0] as HTMLElement;
  const target = nextPanel(Number(main.getAttribute('data-index')), swipe, main.childElementCount);
  if (target === null) return;

  // the account panel never scrolls
  if (target === ACCOUNT_PANEL) document.body.classList.add('lock');

  main.setAttribute('data-index', String(target));
  window.scrollTo({ top: 0 });

  [...main.children].forEach((panel, index) => {
    panel.classList.toggle('focused', index === target);
  });

  // the background video only shows behind the account panel
  if (target !== LIBRARY_PANEL) playBackground();

  const from = main.style.transform || 'translateX(0%)';
  const to = `translateX(-${target * 100}%)`;
  main.style.transform = to;
  void play(main, { transform: [from, to] }, PANEL_SECONDS)
    .then(alignConnectSideElements)
    .then(() => {
      if (target === LIBRARY_PANEL) pauseBackground();
      if (target === ACCOUNT_PANEL) onAccountPanelShown?.();
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
  let start: { x: number; y: number; time: number } | null = null;

  document.body.addEventListener(
    'touchstart',
    event => {
      const touch = event.touches.length === 1 ? event.touches[0] : undefined;
      start = touch ? { x: touch.clientX, y: touch.clientY, time: event.timeStamp } : null;
    },
    { passive: true },
  );
  document.body.addEventListener(
    'touchend',
    event => {
      const touch = event.changedTouches[0];
      if (!start || !touch) return;
      const swipe = swipeOf(touch.clientX - start.x, touch.clientY - start.y, event.timeStamp - start.time);
      start = null;
      if (swipe) switchPanel(swipe);
    },
    { passive: true },
  );
}
