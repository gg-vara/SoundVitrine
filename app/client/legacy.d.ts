// What the page's own scripts define as globals

declare const i18n: Record<string, string>;
declare const clientURLShout: string;
declare const shoutStreamUrl: string;
declare const clientURLUnified: string;

declare function moment(date: string): {
  locale(language: string): void;
  from(now: Date): string;
};

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
