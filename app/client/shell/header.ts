// What the header of the library page does as the page scrolls, away from the page : see tests/header.test.ts

export type ScrollDirection = 'up' | 'down';

// below this, between two scroll events, the header does not react
export const FAST_SCROLL = 10;

// how far the page went since the last scroll event, 0 when it had come to rest
export function createScrollSpeed(restMs = 100) {
  let last: { position: number; time: number } | undefined;
  return (position: number, time: number) => {
    const moved = last && time - last.time < restMs ? position - last.position : 0;
    last = { position, time };
    return moved;
  };
}

// compared to the last position it was asked about
export function createScrollDirection() {
  let last = 0;
  return (position: number): ScrollDirection => {
    const direction = position > last ? 'down' : 'up';
    last = position;
    return direction;
  };
}

export function headerClasses(state: {
  direction: ScrollDirection;
  // results under the search bar stay reachable
  searching: boolean;
  sticky: boolean;
  // the page went further than the height of the header
  outOfReach: boolean;
}) {
  if (state.searching || state.direction === 'up') return 'sticky';
  if (!state.outOfReach) return '';
  return state.sticky ? 'sticky toHide' : 'toHide';
}
