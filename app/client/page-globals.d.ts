// What the page's own scripts define as globals

declare const i18n: Record<string, string>;

declare const pageData: {
  user: string;
  profilePicture?: string;
  loggedIn: boolean;
  libraryUrl: string;
  shoutUrl: string;
  shoutStreamUrl: string;
};

declare class Hammer {
  static TouchInput: unknown;
  constructor(element: HTMLElement, options: { inputClass: unknown });
  on(events: string, handler: (event: { direction: number }) => void): void;
}
