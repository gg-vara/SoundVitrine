// Waiting for what an action sets off in CSS, for as many events as the element expects

// How long CSS transitions last at most, delays included, from their computed lists : "0.5s, 200ms"
const toMs = (list: string) => list.split(',').map(time => Number.parseFloat(time) * (time.trim().endsWith('ms') ? 1 : 1000));

export function longestTransitionMs(durations: string, delays: string): number {
  const delayList = toMs(delays);
  return Math.max(...toMs(durations).map((duration, index) => duration + (delayList[index % delayList.length] ?? 0)));
}

function waitEvents(
  eventName: 'transitionend' | 'animationend',
  emitter: Element,
  action: () => void,
  expected: number,
  limitMs?: number,
): Promise<Element> {
  return new Promise(resolve => {
    let hits = 0;

    const finish = () => {
      emitter.removeEventListener(eventName, onEvent);
      resolve(emitter);
    };
    const onEvent = () => {
      hits += 1;
      if (hits === expected) finish();
    };

    emitter.addEventListener(eventName, onEvent);
    if (limitMs !== undefined) setTimeout(finish, limitMs);
    action();
  });
}

// on top of what it should last : a transition that has nothing to change, or in a hidden tab, never ends
const TRANSITION_MARGIN_MS = 500;

// with nothing to do, it gives null at once
export function waitTransitionEnd(emitter: Element, action: (() => void) | null): Promise<Element | null> {
  if (!action) return Promise.resolve(null);

  const style = getComputedStyle(emitter);
  const limit = longestTransitionMs(style.transitionDuration, style.transitionDelay) + TRANSITION_MARGIN_MS;
  return waitEvents('transitionend', emitter, action, style.transitionProperty.split(',').length, limit);
}

export function waitAnimationEnd(emitter: Element, action: () => void, pseudoElement: string): Promise<Element> {
  const style = getComputedStyle(emitter, pseudoElement);

  // what shows nothing never ends
  if (getComputedStyle(emitter).display === 'none' || style.display === 'none') return Promise.resolve(emitter);

  return waitEvents('animationend', emitter, action, style.animationName.split(',').length);
}
