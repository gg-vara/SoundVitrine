// What shows until the library is there. The loader's markup comes with the page : it must show before any script runs
import { play } from './motion';

const LOADER_ID = 'loader-container';
const PAGE_ID = 'app-music-library';
const FADE_SECONDS = 0.5;

function moveLoaderBar(percent: number) {
  const bar = document.getElementById('loader-bar');
  if (bar) bar.style.transform = `translateX(${percent - 100}%)`;
}

export function showLoader(): Promise<unknown> {
  const loader = document.getElementById(LOADER_ID);
  if (!loader) return Promise.resolve();
  loader.style.opacity = '1';
  return play(loader, { opacity: [0, 1] }, FADE_SECONDS);
}

export function downloadText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.onprogress = event => {
      // a compressed answer tells its size in a header of its own (server/compressed-response.ts)
      const total = Number(request.getResponseHeader('x-original-content-length')) || event.total;
      if (total) moveLoaderBar((event.loaded / total) * 100);
    };
    request.onloadend = () => {
      if (request.status === 200) resolve(request.responseText);
      else reject(new Error(`${url} : status ${request.status}`));
    };
    request.open('GET', url, true);
    request.send(null);
  });
}

const failure = () => document.getElementById('libraryFailure');

// the browser is not what failed
function showBrowserHint(shows: boolean) {
  const hint = document.getElementById('useChrome');
  if (hint) hint.style.display = shows ? '' : 'none';
}

export function showLibraryFailure(retry: () => void) {
  const element = failure();
  if (!element) return;
  element.hidden = false;
  showBrowserHint(false);
  const button = element.querySelector('button');
  if (button) button.onclick = retry;
}

export function hideLibraryFailure() {
  const element = failure();
  if (element) element.hidden = true;
  showBrowserHint(true);
  moveLoaderBar(0);
}

export function showPage(): Promise<unknown> {
  moveLoaderBar(100);
  const loader = document.getElementById(LOADER_ID);
  if (loader) {
    loader.style.opacity = '0';
    void play(loader, { opacity: [1, 0] }, FADE_SECONDS);
  }

  const page = document.getElementById(PAGE_ID);
  if (!page) return Promise.resolve();
  page.style.opacity = '1';
  return play(page, { opacity: [0, 1] }, FADE_SECONDS);
}

export function removeLoader() {
  document.getElementById(LOADER_ID)?.remove();
}
