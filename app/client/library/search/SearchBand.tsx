// The search bar of the library page
import { createSignal, For, Show } from 'solid-js';
import type { SearchResult } from '../data/data';

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
        class="searchInput"
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
      <div class={['searchResults', { show: open() }]} ref={results}>
        <Show when={found().length > 0} fallback={<div class="text-center text-[grey]">{i18n.no_found}</div>}>
          <For each={found()}>
            {entry => {
              const [artist, { Genres: genres, sIndexRange: range }] = entry;
              return (
                <button
                  type="button"
                  class="plainButton searchResult"
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
