// What client/legacy/ and the page's inline scripts define as globals, used here until they move too

declare const i18n: Record<string, string>;
declare const clientURLShout: string;
declare const shoutStreamUrl: string;
declare const clientURLUnified: string;
declare const initialRLoaderUrl: string;

declare class RLoader {
  constructor(targetId: string, url: string);
  initialAnimation(): Promise<unknown>;
}

// with nothing to do, it gives null at once
declare function waitTransitionEnd(eventEmitter: Element, action: (() => void) | null): Promise<Element | null>;
declare function calculateMillisecondsElapsed(dateFrom: string): number;
declare function linkToYoutube(artist: string, albumOrTitle: string): string;
declare function imgLoaded(event: Event): void;
declare function brokenImg(event: Event): void;
declare function resetImgLoader(elem: Element): void;
declare function updateImgLoader(elem: Element, imgUrl: string): void;
declare function brokenImgFr(elem: Element): void;
declare function queryMusicBrainzForAlbumCover(idProcess: string, album: string, artist: string): Promise<string>;
declare function compareDateFromNomHumanized(date: string, now: Date): string;
declare function alignConnectSideElements(): void;

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
