// What client/legacy/ and the page's inline scripts define as globals, used here until they move too

declare const i18n: Record<string, string>;
declare const clientURLShout: string;
declare const shoutStreamUrl: string;
declare const _discoverFilter: import('./library/data').DiscoverFilter;
declare const _discoverSorter: string;

declare function _toggleShutter(targetId: string, resizeInstructionsGetter: () => ResizeInstructions): Promise<unknown>;
declare function _resizeShutter(targetId: string, reason: boolean): ResizeInstructions;
declare function waitTransitionEnd(eventEmitter: Element, action: () => void): Promise<unknown>;
declare function calculateMillisecondsElapsed(dateFrom: string): number;
declare function linkToYoutube(artist: string, albumOrTitle: string): string;
declare function imgLoaded(event: Event): void;
declare function brokenImg(event: Event): void;
declare function resetImgLoader(elem: Element): void;
declare function updateImgLoader(elem: Element, imgUrl: string): void;
declare function brokenImgFr(elem: Element): void;
declare function queryMusicBrainzForAlbumCover(idProcess: string, album: string, artist: string): Promise<string>;
declare function compareDateFromNomHumanized(date: string, now: Date): string;
declare function updateFilter(event: Event): void;

interface ResizeInstructions {
  next: unknown;
  applyNewHeight: (() => void) | null;
}

// what client/legacy/ calls in return
interface Window {
  setupLiveUpdatesForShouts: () => void;
  resizeShout: () => ResizeInstructions;
  generateDataFeeds: (library: import('./library/data').UnifiedLibrary) => ReturnType<typeof import('./library/data').createDataFeeds>;
}
