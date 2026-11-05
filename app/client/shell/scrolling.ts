// The header following the page as it scrolls, and swipes between the library and the account panel
import { createScrollDirection, createScrollSpeed, FAST_SCROLL, headerClasses } from './header';

const header = () => document.getElementsByTagName('header')[0] as HTMLElement;

export function setHeaderClasses(classes: string) {
  header().setAttribute('class', classes);
}

const directionFrom = createScrollDirection();
let updating = false;

export function updateHeader() {
  const element = header();
  const classes = headerClasses({
    direction: directionFrom(window.scrollY),
    searching: document.querySelector('header .searchResults.show') !== null,
    sticky: element.classList.contains('sticky'),
    outOfReach: window.scrollY > element.clientHeight,
  });
  if (updating || classes === element.getAttribute('class')) return;

  updating = true;
  window.requestAnimationFrame(() => {
    setHeaderClasses(classes);
    updating = false;
  });
}

const speedAt = createScrollSpeed();

function onScroll() {
  if (Math.abs(speedAt(window.scrollY, performance.now())) >= FAST_SCROLL) updateHeader();
}

export function followScrolling() {
  document.addEventListener('scroll', onScroll);
}

// what scrolls the page by itself must not move the header
export function withoutFollowingScrolling(work: Promise<unknown>) {
  document.removeEventListener('scroll', onScroll);
  return work.finally(followScrolling);
}

export function followSwipes() {
  const swipes = new Hammer(document.body, { inputClass: Hammer.TouchInput });
  swipes.on('swipeleft swiperight', event => hNavigate(event.direction));
}
