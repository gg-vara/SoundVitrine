// What client/legacy/ and the page's inline scripts define as globals, used here until they move too

declare const i18n: Record<string, string>;
declare const clientURLShout: string;
declare const shoutStreamUrl: string;
declare const clientURLUnified: string;

// with nothing to do, it gives null at once
declare function waitTransitionEnd(eventEmitter: Element, action: (() => void) | null): Promise<Element | null>;
declare function calculateMillisecondsElapsed(dateFrom: string): number;
declare function waitAnimationEnd(eventEmitter: Element, action: () => void, pseudoElement: string): Promise<Element | null>;
declare function compareDateFromNomHumanized(date: string, now: Date): string;

declare class Hammer {
  static TouchInput: unknown;
  constructor(element: HTMLElement, options: { inputClass: unknown });
  on(events: string, handler: (event: { direction: number }) => void): void;
}

// what the page calls in return
interface Window {
  toggleFeed: () => void;
  toggleProfile: () => void;
  toggleStats: () => void;
  hNavigate: () => void;
}
