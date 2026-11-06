// Browsing a library by genre, artist and album, down to what is known of an album

// biome-ignore-all lint/a11y/noStaticElementInteractions: a list opens by a click anywhere on it, its button does it for the keyboard

import { createEffect, createMemo, createSignal, For, flush, onCleanup } from 'solid-js';
import { type createDataFeeds, type FilterItem, sortItems } from '../library/data';
import { humanizedDate } from '../library/humanizedDate';
import { youtubeSearchUrl } from '../library/youtube';
import { COVER, createCoverFinder, onCoverBroken, onCoverLoaded } from '../shell/cover';
import { play } from '../shell/motion';
import { scrollToElement } from '../shell/navigation';
import {
  appliedFilters,
  type DiscoverFilter,
  type FilterId,
  filterSizesCss,
  listToClose,
  NO_FILTER,
  nextSorters,
  parseSorters,
  pickedFilter,
  SORT_CATEGORIES,
  type SortCategory,
  sorterText,
  sortIcon,
} from './filters';

export interface DiscoverPanelControls {
  // from elsewhere on the page, which also tells the filters above
  select: (wanted: Partial<DiscoverFilter>) => void;
}

const SORTER_STORAGE_KEY = '_discoverSorter';
const SORT_ANIMATION_MS = 300;

// a transition's end never comes in a hidden tab
const SHOW_SECONDS = 0.4;

const sizeOf = (element: HTMLElement) => ({ width: element.scrollWidth, height: element.scrollHeight });

function applyFilterSizes(id: string, placeholder: HTMLElement, list: HTMLElement) {
  // the previous sizes must not limit those measured
  document.head.querySelector(`style[data-ct="${id}"]`)?.remove();

  // its true size : it leaves the flow once something is selected
  list.style.position = 'relative';
  const css = filterSizesCss(id, sizeOf(placeholder), sizeOf(list), parseFloat(getComputedStyle(document.documentElement).fontSize));
  list.style.position = '';

  const style = document.createElement('style');
  style.dataset.ct = id;
  style.textContent = css;
  document.head.appendChild(style);
}

// items slide from where they were to where the change put them
function slidingItems(items: () => Iterable<HTMLElement>, change: () => void) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    change();
    return;
  }

  const tops = new Map([...items()].map(item => [item, item.getBoundingClientRect().top]));
  change();
  for (const item of items()) {
    const moved = (tops.get(item) ?? 0) - item.getBoundingClientRect().top;
    if (moved)
      item.animate([{ transform: `translateY(${moved}px)` }, { transform: 'none' }], { duration: SORT_ANIMATION_MS, easing: 'ease' });
  }
}

// their width and height come from applyFilterSizes, which needs the "open" class
const FILTER =
  'ml-[.7rem] mt-4 min-h-4 flex-col [transition:all_.3s_ease] last:mr-4 last:mb-5 portrait:mt-[1.3rem] portrait:first:mt-2 landscape:first:ml-0 [&::before]:absolute [&::before]:top-[-.9rem] [&::before]:left-[-.3rem] [&::before]:z-30 [&::before]:text-[.65em] [&::before]:text-[grey] [&::before]:[content:attr(data-sl)]';
// what a button has of its own, as they look like the text around them
const PLAIN_BUTTON = 'cursor-pointer appearance-none [border:none] bg-transparent p-0 text-start [unicode-bidi:isolate] [font:inherit]';
const PLACEHOLDER = `${PLAIN_BUTTON} absolute [transition:transform_.3s_ease] hover:[transform:translate(.35rem,0)] focus-visible:[transform:translate(.35rem,0)]`;
const ITEM = `${PLAIN_BUTTON} [transition:transform_.3s_ease] hover:[transform:translate(.35rem,0)] focus-visible:[transform:translate(.35rem,0)] [&[data-count]::after]:ml-1 [&[data-count]::after]:align-middle [&[data-count]::after]:text-[grey]`;
const SORT_BUTTON = `${PLAIN_BUTTON} mx-[.1rem] my-0 flex shrink-0 grow-0 opacity-60 [transition:all_.1s_ease] hover:[&>*]:opacity-80! [&>i]:cursor-pointer [&>i]:[transition:all_.3s_ease]`;

const isActivation = (event: KeyboardEvent) => event.code === 'Enter' || event.code === 'Space' || event.code === 'NumpadEnter';

const CAPTION = 'cursor-default text-[.8rem] text-[rgba(0,0,0,.6)]';
const VALUE = 'mb-4 text-[1rem] text-white';

function FilterUI(props: {
  id: FilterId;
  label: string;
  items: FilterItem[];
  sorter: string;
  selected: string | null;
  open: boolean;
  toggle: () => void;
  pick: (name: string) => void;
  pickByKey: (name: string) => void;
}) {
  // the same objects however sorted : For then moves their elements
  const sorted = createMemo(() => sortItems(props.items, props.sorter));
  const active = () => props.items.length > 0 || !!props.selected;

  // albums tell their year, whether selected or not
  const itemAfter = (selected: boolean) => {
    if (props.id === 'albumUI') return "[&[data-count]::after]:text-[.8rem] [&[data-count]::after]:[content:'-_'_attr(data-count)]";
    return selected
      ? "[&[data-count]::after]:text-[.6rem] [&[data-count]::after]:[content:'»']"
      : '[&[data-count]::after]:text-[.6rem] [&[data-count]::after]:[content:attr(data-count)]';
  };
  const itemColor = (selected: boolean) => {
    if (!props.selected) return 'text-[rgba(29,29,29,1)]';
    return selected ? 'text-[rgba(0,0,0,1)]' : 'text-[rgba(0,0,0,.25)]';
  };

  let placeholder!: HTMLButtonElement;
  let list!: HTMLDivElement;

  createEffect(
    () => [props.items, props.selected],
    () => applyFilterSizes(props.id, placeholder, list),
  );

  return (
    <div
      id={props.id}
      data-sl={props.label}
      data-choosing={active() && !props.selected ? '' : undefined}
      class={[FILTER, active() ? 'flex' : 'hidden', { open: props.open }]}
      onMouseDown={props.toggle}
    >
      <button
        type="button"
        hidden={!props.selected}
        aria-expanded={props.open ? 'true' : 'false'}
        class={[
          PLACEHOLDER,
          props.open ? '-z-1 text-[rgba(0,0,0,0)]' : 'z-20 [color:inherit]',
          props.selected ? "w-fit [&::after]:[content:'»']" : '',
        ]}
        ref={placeholder}
        onKeyDown={event => {
          if (!isActivation(event)) return;
          event.preventDefault();
          props.toggle();
        }}
      >
        {props.selected ?? ''}
      </button>
      <div
        class={[
          'flex w-fit flex-col',
          props.selected ? 'absolute origin-[50%_0] [transition:transform_.5s_ease_0s]' : '',
          props.selected ? (props.open ? '[transform:scale(1)] opacity-100' : '[transform:scaleY(0)] opacity-10') : '',
        ]}
        // out of reach once closed : only its size hides it
        inert={!!props.selected && !props.open}
        ref={list}
      >
        <For each={sorted()}>
          {item => (
            <button
              type="button"
              aria-pressed={item.nFilter === props.selected ? 'true' : 'false'}
              class={[ITEM, itemAfter(item.nFilter === props.selected), itemColor(item.nFilter === props.selected)]}
              data-count={item.count as number}
              data-order={item.order}
              onMouseDown={event => {
                // it would toggle the list too
                event.stopPropagation();
                props.pick(item.nFilter);
              }}
              onKeyDown={event => {
                if (!isActivation(event)) return;
                event.preventDefault();
                props.pickByKey(item.nFilter);
              }}
            >
              {item.nFilter}
            </button>
          )}
        </For>
      </div>
    </div>
  );
}

export function DiscoverPanel(props: {
  feeds: ReturnType<typeof createDataFeeds> | undefined;
  owner: string;
  controls: (controls: DiscoverPanelControls) => void;
}) {
  const [filter, setFilter] = createSignal(NO_FILTER);
  const [opened, setOpened] = createSignal<FilterId[]>([]);
  const [sorters, setSorters] = createSignal(parseSorters(localStorage.getItem(SORTER_STORAGE_KEY)));
  const [shown, setShown] = createSignal(false);

  // each list depends on one filter alone : the others changing must not build it again
  const genre = createMemo(() => filter().genreUI);
  const artist = createMemo(() => filter().artistUI);

  const genres = createMemo(() => props.feeds?.genreUI() ?? []);
  const artists = createMemo(() => props.feeds?.artistUI(genre()) ?? []);
  const albums = createMemo(() => props.feeds?.albumUI(artist()) ?? []);
  const album = createMemo(() => props.feeds?.albumInfos(artist(), filter().albumUI));

  let wrapper!: HTMLDivElement;
  let infos!: HTMLDivElement;
  let cover!: HTMLDivElement;
  const findCover = createCoverFinder('albumInfos', () => cover);

  function updateCover() {
    const current = album();
    findCover(current?.Album, current?.Artist);
  }

  function show(): Promise<unknown> {
    setShown(true);
    flush();
    return play(infos, { opacity: [0.5, 1] }, SHOW_SECONDS);
  }

  function select(wanted: Partial<DiscoverFilter>) {
    const next = appliedFilters(filter(), wanted);
    setFilter(next);
    setOpened(ids => ids.filter(id => !next[id]));
    flush();

    updateCover();
    if (album()) {
      void (shown() ? Promise.resolve() : show()).then(() => {
        if (wanted.albumUI) void scrollToElement(infos, -10);
      });
    } else {
      setShown(false);
      flush();
    }

    if (!wanted.albumUI) {
      // the list to choose from next, its label above it
      const nextList = wrapper.querySelector('[data-choosing]');
      if (nextList) void scrollToElement(nextList, -30);
    }
  }

  // what was picked is about to go out of reach, the focus with it
  function focusWhatFollows() {
    const target =
      (album() ? infos.querySelector('a') : wrapper.querySelector('[data-choosing] [data-order]')) ??
      [...wrapper.querySelectorAll('button[aria-expanded]:not([hidden])')].at(-1);
    // the page scrolls by itself, with a margin
    (target as HTMLElement | undefined)?.focus({ preventScroll: true });
  }

  function sortBy(category: SortCategory) {
    const next = nextSorters(sorters(), category);
    localStorage.setItem(SORTER_STORAGE_KEY, sorterText(next));
    slidingItems(
      () => wrapper.querySelectorAll<HTMLElement>('[data-order]'),
      () => {
        setSorters(next);
        flush();
      },
    );
  }

  function closeListOnEscape(event: KeyboardEvent) {
    if (event.code !== 'Escape') return;
    const id = listToClose(opened(), filter());
    if (!id) return;

    const element = document.getElementById(id);
    const hadFocus = element?.contains(document.activeElement);
    setOpened(ids => ids.filter(other => other !== id));
    flush();
    // the list is now out of reach, the focus with it
    if (hadFocus) element?.querySelector<HTMLElement>('button[aria-expanded]')?.focus({ preventScroll: true });
  }
  document.addEventListener('keydown', closeListOnEscape);
  onCleanup(() => document.removeEventListener('keydown', closeListOnEscape));

  props.controls({ select });

  const filterUI = (id: FilterId, label: string, items: () => FilterItem[]) => (
    <FilterUI
      id={id}
      label={label}
      items={items()}
      sorter={sorterText(sorters())}
      selected={filter()[id]}
      open={opened().includes(id)}
      toggle={() => setOpened(ids => (ids.includes(id) ? ids.filter(other => other !== id) : [...ids, id]))}
      pick={name => select(pickedFilter(filter(), id, name))}
      pickByKey={name => {
        select(pickedFilter(filter(), id, name));
        focusWhatFollows();
      }}
    />
  );

  return (
    <>
      <div class="absolute top-14 left-[6.6rem] flex flex-row text-[.8rem] text-[grey] portrait:top-[1.4rem] portrait:left-32">
        <For each={SORT_CATEGORIES}>
          {category => (
            <button
              type="button"
              class={[SORT_BUTTON, sorters().active === category ? 'text-black' : '[color:inherit]']}
              title={i18n[`sort_${category}`]}
              aria-pressed={sorters().active === category ? 'true' : 'false'}
              onClick={() => sortBy(category)}
            >
              <i class={`fas ${sortIcon(category, sorters().directions[category])}`} />
            </button>
          )}
        </For>
      </div>
      <div class="m-0 flex portrait:flex-col" ref={wrapper}>
        {filterUI('genreUI', 'Genres', genres)}
        {filterUI('artistUI', i18n.artists ?? '', artists)}
        {filterUI('albumUI', 'Albums', albums)}
      </div>
      <div
        id="albumInfos"
        class={[
          'min-h-[1.3rem] min-w-[1.3rem] [transition:all_.4s_ease-in_0s]',
          shown()
            ? 'z-1 grow self-stretch bg-white p-4 shadow-[0_2px_2px_0_rgba(0,0,0,.16),0_0_0_1px_rgba(0,0,0,.08)]'
            : 'absolute right-8 mt-[.2rem] bg-[rgb(248,248,248)] [animation:flickerAnimation_2s_infinite_ease]',
        ]}
        ref={infos}
      >
        <div class={shown() ? 'flex flex-col text-[#f5f5f5]' : 'hidden'}>
          <div class="mb-2 flex justify-around portrait:[&>*]:mx-2 portrait:[&>*]:my-0">
            <div class={CAPTION}>
              {i18n.year}
              <div class={VALUE}>{album()?.Year as string}</div>
            </div>
            <div class={CAPTION}>
              Genre
              <div class={VALUE}>{album()?.Genre}</div>
            </div>
            <div class={CAPTION}>
              {i18n.dateAddition}
              <div class={VALUE} title={album()?.DateAdded}>
                {album() ? humanizedDate(album()?.DateAdded ?? '', new Date(), document.documentElement.lang) : ''}
              </div>
            </div>
          </div>
          <div class="flex flex-wrap items-center justify-around">
            <div class="flex flex-col items-center text-center">
              <div class={CAPTION}>
                Album
                <div class={VALUE}>{album()?.Album}</div>
              </div>
              <div
                class={[
                  COVER,
                  'noCoverMessage mb-2 flex min-h-[250px] min-w-[250px] text-[.6rem] shadow-[0px_0px_13px_1px_rgba(255,255,255,.25)] [&:not(.searchingCover)]:min-w-[20vw]',
                ]}
                data-no-cover-found={i18n.no_cover_found}
                ref={cover}
              >
                <img class="min-h-[250px] min-w-[250px]" onLoad={onCoverLoaded} onError={onCoverBroken} alt="" />
              </div>
            </div>
            <div class={[CAPTION, 'my-4 mr-0 ml-8']}>
              {i18n.tracks}
              <ol class="m-0 flex flex-col flex-wrap items-start justify-around pl-[1.1rem] text-[1rem] text-white">
                <For each={Object.values(album()?.Tracks ?? {})}>{track => <li>{track}</li>}</For>
              </ol>
            </div>
          </div>
          <div class="flex items-center justify-center p-2 pt-8 select-auto">
            <a
              class="bg-[#efefef] p-2 text-[grey] shadow-[0px_0px_5px_0px_#afafaf] [transition:all_.4s] hover:text-black hover:[&_i]:text-[red]"
              rel="noopener"
              href={album() && youtubeSearchUrl(album()?.Artist ?? '', album()?.Album ?? '')}
              target={album() ? '_blank' : undefined}
            >
              <i class="fab fa-youtube" />
              <span>{i18n.listenTTA}</span>
            </a>
          </div>
        </div>
        <div class="wAnim" data-owner={props.owner} />
      </div>
    </>
  );
}
