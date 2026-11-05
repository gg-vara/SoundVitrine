// Which panel of the page comes next, away from the page : see tests/panels.test.ts

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
