// The search bar of the library page. "searchResults" and "show" are read by client/shell/scrolling.ts :
// the header stays while searching
import { createSignal, For, Show } from 'solid-js';
import type { SearchResult } from '../library/data';

const TYPING_DELAY_MS = 350;

export function SearchBand(props: {
  search: (typed: string) => Record<string, SearchResult> | null | undefined;
  // gets the event, its element holding the filter to apply in data-n-filter
  select: (event: Event) => void;
}) {
  const [found, setFound] = createSignal<[string, SearchResult][]>([]);
  const [open, setOpen] = createSignal(false);

  let box!: HTMLDivElement;
  let input!: HTMLInputElement;
  let results!: HTMLDivElement;
  let typing: ReturnType<typeof setTimeout> | undefined;

  // on what changes the text rather than on keys : pasting with the mouse, or what an input method composes, has none
  function typed() {
    clearTimeout(typing);
    typing = setTimeout(() => {
      setFound(Object.entries(props.search(input.value) ?? {}));
      setOpen(input.value !== '');
    }, TYPING_DELAY_MS);
  }

  function select(event: Event) {
    setOpen(false);
    props.select(event);
  }

  function keyOnInput(event: KeyboardEvent) {
    if (event.code !== 'ArrowDown') return;
    event.preventDefault();
    (results.firstElementChild as HTMLElement | null)?.focus();
  }

  function keyOnResult(event: KeyboardEvent) {
    if (event.code === 'Enter') select(event);
    if (event.code !== 'ArrowUp' && event.code !== 'ArrowDown') return;
    event.preventDefault();

    const result = event.currentTarget as HTMLElement;
    const next = event.code === 'ArrowUp' ? (result.previousElementSibling ?? input) : result.nextElementSibling;
    (next as HTMLElement | null)?.focus();
  }

  return (
    <div
      class="relative flex min-w-48 grow"
      ref={box}
      onFocusOut={event => {
        if (!box.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <input
        class="w-full flex-1 [border:none] p-2 text-[.55rem] opacity-80 shadow-[0_2px_2px_0_rgba(0,0,0,.16),0_0_0_1px_rgba(0,0,0,.08)] hover:[outline:none] focus:opacity-100 focus:[outline:none] hover:shadow-[0_3px_8px_0_rgba(0,0,0,.2),0_0_0_1px_rgba(0,0,0,.08)] focus:shadow-[0_3px_8px_0_rgba(0,0,0,.2),0_0_0_1px_rgba(0,0,0,.08)]"
        type="text"
        aria-label={i18n.phSearch}
        spellcheck={false}
        placeholder={i18n.phSearch}
        autocomplete="off"
        ref={input}
        onInput={typed}
        onFocus={() => setOpen(input.value !== '')}
        onKeyDown={keyOnInput}
      />
      <div
        class={[
          'searchResults absolute top-[1.65rem] z-50 hidden max-h-40 w-full overflow-x-hidden overflow-y-auto bg-white p-2 [font-family:Arial] [outline:none] [transition:all_.3s_ease_0s] [&.show]:block shadow-[0_3px_8px_0_rgba(0,0,0,.2),0_0_0_1px_rgba(0,0,0,.08)]',
          { show: open() },
        ]}
        ref={results}
      >
        <Show when={found().length > 0} fallback={<div class="text-center text-[grey]">{i18n.no_found}</div>}>
          <For each={found()}>
            {entry => {
              const [artist, { Genres: genres, sIndexRange: range }] = entry;
              return (
                <button
                  type="button"
                  class="block w-full cursor-pointer appearance-none [border:none] bg-transparent px-2 py-0 text-start [unicode-bidi:isolate] [font:inherit] [color:inherit] [transition:all_.2s] hover:bg-[rgba(128,128,128,.05)] hover:[transform:translate(.15rem,0)] focus:bg-[rgba(128,128,128,.05)] focus:[transform:translate(.15rem,0)]"
                  title={artist}
                  data-n-filter={JSON.stringify({ genreUI: genres[0], artistUI: artist })}
                  onMouseDown={select}
                  onKeyDown={keyOnResult}
                >
                  <span class="text-[.75rem] text-[grey]">{artist.substring(0, range[0])}</span>
                  <span class="text-[.75rem] font-bold text-[#666666]">{artist.substring(range[0], range[1])}</span>
                  <span class="text-[.75rem] text-[grey]">{artist.substring(range[1])}</span>
                  <span class="text-[.5rem] text-[grey]">{`   (${genres.join(', ')})`}</span>
                </button>
              );
            }}
          </For>
        </Show>
      </div>
      <Show when={found().length > 0}>
        <span class="absolute top-2 right-[.2rem] text-[.5rem] text-[grey] [font-family:Arial]">{`${found().length} ${i18n.found}`}</span>
      </Show>
    </div>
  );
}
