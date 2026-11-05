// What follows the size of the window decides here, away from the page : see tests/resizing.test.ts

export interface OnResize {
  // whatever changed
  any: (() => void)[];
  // what depends on the width, as a change of height alone is often the browser's bars coming and going
  width: (() => void)[];
}

export function createResizeHandler(onResize: OnResize, widthNow: () => number) {
  let width = widthNow();
  return () => {
    for (const run of onResize.any) run();

    if (widthNow() === width) return;
    width = widthNow();
    for (const run of onResize.width) run();
  };
}

// runs once things have been quiet for that long
export function debounced(run: () => void, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(run, ms);
  };
}
