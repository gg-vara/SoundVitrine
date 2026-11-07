// The video behind the account panel : nothing is downloaded before it opens, its poster shows first, then a small copy,
// then the full one once it can play through. The small one stays where the browser cannot play the other, or the other way
import { play } from '../shared/motion';

const CROSSFADE_SECONDS = 1;

const active = () => document.querySelector<HTMLVideoElement>('#bg video[data-active]');
const full = () => document.querySelector<HTMLVideoElement>('#bg video:not([data-active])');

let inView = false;

async function swapToFull(next: HTMLVideoElement) {
  const current = active();
  if (current) next.currentTime = current.currentTime;
  next.dataset.active = '';
  if (inView) await next.play().catch(() => {});
  await play(next, { opacity: [0, 1] }, CROSSFADE_SECONDS);
  next.style.opacity = '1';
  current?.remove();
}

function loadFull() {
  const next = full();
  if (!next || next.preload === 'auto') return;
  next.addEventListener('canplaythrough', () => void swapToFull(next), { once: true });
  next.preload = 'auto';
  next.load();
}

export function playBackground() {
  inView = true;
  const current = active();
  if (!current) return;
  current.addEventListener('playing', loadFull, { once: true });
  // a browser without this format goes on to the other one
  current.addEventListener('error', loadFull, { once: true });
  void current.play().catch(() => {});
}

export function pauseBackground() {
  inView = false;
  active()?.pause();
}
