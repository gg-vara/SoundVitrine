// Animations to wait for, in sequence. The element takes its final state by itself : its style is set by who asks
import { animate } from 'motion/mini';

const HIDDEN_TAB_MARGIN_MS = 200;

// in a hidden tab, an animation does not end : what comes next must not wait for it to show again
export function play(
  element: Element,
  keyframes: Parameters<typeof animate>[1],
  seconds: number,
  options: { pseudoElement?: string } = {},
): Promise<void> {
  return Promise.race([
    Promise.resolve(animate(element, keyframes, { duration: seconds, ease: 'easeInOut', ...options })).then(() => undefined),
    new Promise<void>(resolve => setTimeout(resolve, seconds * 1000 + HIDDEN_TAB_MARGIN_MS)),
  ]);
}
