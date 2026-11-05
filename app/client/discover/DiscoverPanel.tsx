// Browsing a library by genre, artist and album, down to what is known of an album

// the markup filter.css and albumInfos.css expect, mouse only as it always was : for when these styles move to Tailwind
// biome-ignore-all lint/a11y/noLabelWithoutControl: see above
// biome-ignore-all lint/a11y/noStaticElementInteractions: see above
// biome-ignore-all lint/a11y/useKeyWithClickEvents: see above

import { createEffect, createMemo, createSignal, For, flush } from 'solid-js';
import { type createDataFeeds, type FilterItem, sortItems } from '../library/data';
import {
  appliedFilters,
  type DiscoverFilter,
  type FilterId,
  filterSizesCss,
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
const SHOW_LIMIT_MS = 1000;

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

function FilterUI(props: {
  id: FilterId;
  label: string;
  items: FilterItem[];
  sorter: string;
  selected: string | null;
  open: boolean;
  toggle: () => void;
  pick: (name: string) => void;
}) {
  // the same objects however sorted : For then moves their elements
  const sorted = createMemo(() => sortItems(props.items, props.sorter));

  let placeholder!: HTMLSpanElement;
  let list!: HTMLDivElement;

  createEffect(
    () => [props.items, props.selected],
    () => applyFilterSizes(props.id, placeholder, list),
  );

  return (
    <div
      id={props.id}
      data-sl={props.label}
      class={['filterUI', { active: props.items.length > 0 || !!props.selected, hasSelection: !!props.selected, open: props.open }]}
      onMouseDown={props.toggle}
    >
      <span class="ph" ref={placeholder}>
        {props.selected ?? ''}
      </span>
      <div class="list" ref={list}>
        <For each={sorted()}>
          {item => (
            <div
              class={{ selected: item.nFilter === props.selected }}
              data-count={item.count as number}
              data-order={item.order}
              onMouseDown={event => {
                // it would toggle the list too
                event.stopPropagation();
                props.pick(item.nFilter);
              }}
            >
              {item.nFilter}
            </div>
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
  let coverAsked = 0;

  function updateCover() {
    const asked = ++coverAsked;
    const current = album();
    resetImgLoader(cover);
    if (!current) return;
    // an answer can come for what is no longer shown, if only the request cancelled by this one
    queryMusicBrainzForAlbumCover('albumInfos', current.Album, current.Artist).then(
      imgUrl => {
        if (asked === coverAsked) updateImgLoader(cover, imgUrl);
      },
      () => {
        if (asked === coverAsked) brokenImgFr(cover);
      },
    );
  }

  function show(): Promise<unknown> {
    return Promise.race([
      waitTransitionEnd(infos, () => {
        setShown(true);
        flush();
      }),
      new Promise(resolve => setTimeout(resolve, SHOW_LIMIT_MS)),
    ]);
  }

  function select(wanted: Partial<DiscoverFilter>) {
    const next = appliedFilters(filter(), wanted);
    setFilter(next);
    setOpened(ids => ids.filter(id => !next[id]));
    flush();

    updateCover();
    if (album()) {
      void (shown() ? Promise.resolve() : show()).then(() => {
        if (wanted.albumUI) vNavigate(infos, -10);
      });
    } else {
      setShown(false);
      flush();
    }

    if (!wanted.albumUI) {
      // the list to choose from next, its label above it
      const nextList = wrapper.querySelector('.filterUI.active:not(.hasSelection)');
      if (nextList) vNavigate(nextList, -30);
    }
  }

  function sortBy(category: SortCategory) {
    const next = nextSorters(sorters(), category);
    localStorage.setItem(SORTER_STORAGE_KEY, sorterText(next));
    slidingItems(
      () => wrapper.querySelectorAll<HTMLElement>('.list > *'),
      () => {
        setSorters(next);
        flush();
      },
    );
  }

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
    />
  );

  return (
    <>
      <div class="sorter">
        <For each={SORT_CATEGORIES}>
          {category => (
            <label
              class={['clickable', { active: sorters().active === category }]}
              title={i18n[`sort_${category}`]}
              data-category={category}
              data-direction={sorters().directions[category]}
              onClick={() => sortBy(category)}
            >
              <i class={`fas ${sortIcon(category, sorters().directions[category])}`} />
            </label>
          )}
        </For>
      </div>
      <div class="filterWrapper" ref={wrapper}>
        {filterUI('genreUI', 'Genres', genres)}
        {filterUI('artistUI', i18n.artists ?? '', artists)}
        {filterUI('albumUI', 'Albums', albums)}
      </div>
      <div id="albumInfos" class={{ show: shown() }} ref={infos}>
        <div class="aiContent">
          <div class="hInfos">
            <label>
              {i18n.year}
              <div id="aYear">{album()?.Year as string}</div>
            </label>
            <label>
              Genre
              <div id="aGenre">{album()?.Genre}</div>
            </label>
            <label>
              {i18n.dateAddition}
              <div id="aDateAdded" title={album()?.DateAdded}>
                {album() ? compareDateFromNomHumanized(album()?.DateAdded ?? '', new Date()) : ''}
              </div>
            </label>
          </div>
          <div class="hMisc">
            <div class="imgContainer">
              <label>
                Album
                <div id="aTitle">{album()?.Album}</div>
              </label>
              <div id="aImage" class="imgLoader" data-no-cover-found={i18n.no_cover_found} ref={cover}>
                <img onLoad={imgLoaded} onError={brokenImg} alt="" />
              </div>
            </div>
            <label style={{ margin: '1rem 0 1rem 2rem' }}>
              {i18n.tracks}
              <ol id="aTracks">
                <For each={Object.values(album()?.Tracks ?? {})}>{track => <li>{track}</li>}</For>
              </ol>
            </label>
          </div>
          <div class="listen">
            <a
              class="animated"
              rel="noopener"
              href={album() && linkToYoutube(album()?.Artist ?? '', album()?.Album ?? '')}
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
