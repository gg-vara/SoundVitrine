// What shows until the library is there. The loader's markup comes with the page : it must show before any script runs

const LOADER_ID = 'loader-container';
const PAGE_ID = 'app-music-library';

function moveLoaderBar(percent: number) {
  const bar = document.getElementById('loader-bar');
  if (bar) bar.style.transform = `translateX(${percent - 100}%)`;
}

export function showLoader(): Promise<unknown> {
  const loader = document.getElementById(LOADER_ID);
  if (!loader) return Promise.resolve();
  return waitTransitionEnd(loader, () => {
    loader.style.opacity = '1';
  });
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

export function showPage(): Promise<unknown> {
  moveLoaderBar(100);
  const loader = document.getElementById(LOADER_ID);
  if (loader) loader.style.opacity = '0';

  const page = document.getElementById(PAGE_ID);
  if (!page) return Promise.resolve();
  return waitTransitionEnd(page, () => {
    page.style.opacity = '1';
  });
}

export function removeLoader() {
  document.getElementById(LOADER_ID)?.remove();
}
