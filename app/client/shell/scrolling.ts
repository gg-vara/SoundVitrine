// The header following the page as it scrolls
import { createScrollDirection, createScrollSpeed, FAST_SCROLL, headerClasses } from './header';

const header = () => document.getElementsByTagName('header')[0] as HTMLElement;

// the header's own classes style it : only these change
const STATE_CLASSES = ['sticky', 'toHide'];

export function setHeaderClasses(classes: string) {
  const { classList } = header();
  classList.remove(...STATE_CLASSES);
  if (classes) classList.add(...classes.split(' '));
}

const headerState = (element: HTMLElement) => STATE_CLASSES.filter(name => element.classList.contains(name)).join(' ');

const directionFrom = createScrollDirection();
let updating = false;

function updateHeader() {
  const element = header();
  const classes = headerClasses({
    direction: directionFrom(window.scrollY),
    searching: document.querySelector('header .searchResults.show') !== null,
    sticky: element.classList.contains('sticky'),
    outOfReach: window.scrollY > element.clientHeight,
  });
  if (updating || classes === headerState(element)) return;

  updating = true;
  window.requestAnimationFrame(() => {
    setHeaderClasses(classes);
    updating = false;
  });
}

// a page that got shorter may have nothing left to scroll, which is what brings the header back
export function revealHeaderInReach() {
  const element = header();
  if (element.classList.contains('toHide') && window.scrollY <= element.clientHeight) setHeaderClasses('sticky');
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
  return work.finally(() => {
    // the page moved meanwhile : the next direction is from where it is now
    directionFrom(window.scrollY);
    followScrolling();
  });
}
