// Entry of the browser build, on the library page

import { render } from '@solidjs/web';
import { createSignal, flush } from 'solid-js';
import { DiscoverPanel, type DiscoverPanelControls } from './discover/DiscoverPanel';
import { FeedPanel } from './feed/FeedPanel';
import { createDataFeeds, type FeedAlbum, type UnifiedLibrary } from './library/data';
import { humanizedDate } from './library/humanizedDate';
import { SearchBand } from './search/SearchBand';
import { createAccountPanel } from './shell/accountPanel';
import { downloadText, hideLibraryFailure, removeLoader, showLibraryFailure, showLoader, showPage } from './shell/loader';
import {
  type ApplyHeight,
  alignConnectSideElements,
  followAccountPanel,
  followResizing,
  followSwipes,
  resizeShutter,
  scrollToElement,
  switchPanel,
  toggleShutter,
} from './shell/navigation';
import { ShoutPanel, type ShoutPanelControls } from './shout/ShoutPanel';
import { StatsPanel, type StatsPanelControls } from './stats/StatsPanel';
import './style.css';

const FEED_ID = 'feedContainer';
const PROFILE_ID = 'profileContainer';
const STATS_ID = 'statsContainer';

const isChecked = (id: string) => (document.getElementById(id) as HTMLInputElement).checked;
const resizeFeed = () => resizeShutter(FEED_ID, isChecked('showFeed'));
const resizeProfile = () => resizeShutter(PROFILE_ID, isChecked('showProfile'));
const resizeStats = () => resizeShutter(STATS_ID, isChecked('showStats'));

// on resizing, what it takes to fit
const fitted = (getHeight: () => ApplyHeight) => () => getHeight()?.();

const shoutContainer = document.getElementById('shoutContainer');
const searchContainer = document.getElementById('searchBand');
const feedContainer = document.getElementById('feedWrapper');
const statsContainer = document.getElementById('statsWrapper');
const discoverContainer = document.getElementById('discoverContent');

if (shoutContainer && searchContainer && feedContainer && statsContainer && discoverContainer) {
  let panel!: ShoutPanelControls;
  let stats!: StatsPanelControls;
  let discover!: DiscoverPanelControls;
  const [feeds, setFeeds] = createSignal<ReturnType<typeof createDataFeeds>>();
  const [uploads, setUploads] = createSignal<Record<string, FeedAlbum[]>>({});

  // what the search bar and the feed offer holds, on its element, the filters to apply
  const selectFromElement = (event: Event) => {
    discover.select(JSON.parse((event.currentTarget as HTMLElement).dataset.nFilter ?? '{}'));
  };

  render(
    () => (
      <ShoutPanel
        controls={controls => {
          panel = controls;
        }}
      />
    ),
    shoutContainer,
  );
  render(() => <SearchBand search={typed => feeds()?.searchBand(typed)} select={selectFromElement} />, searchContainer);
  render(() => <FeedPanel intervals={uploads()} select={selectFromElement} />, feedContainer);
  render(
    () => (
      <StatsPanel
        counts={() => {
          const library = feeds();
          return library && { albums: library.statsAlbums(), artists: library.statsArtists() };
        }}
        controls={controls => {
          stats = controls;
        }}
      />
    ),
    statsContainer,
  );
  render(
    () => (
      <DiscoverPanel
        feeds={feeds()}
        owner={discoverContainer.dataset.owner ?? ''}
        controls={controls => {
          discover = controls;
        }}
      />
    ),
    discoverContainer,
  );

  // called by the page, for what opens and closes under the header
  window.toggleFeed = () => void toggleShutter(FEED_ID, resizeFeed).then(scrollToElement);
  window.toggleProfile = () => void toggleShutter(PROFILE_ID, resizeProfile);
  window.toggleStats = () => {
    if (isChecked('showStats')) void stats.open();
    void toggleShutter(STATS_ID, resizeStats).then(scrollToElement);
  };

  // called by the page, from the buttons going to the other panel
  window.hNavigate = () => switchPanel();

  function useLibrary(library: UnifiedLibrary) {
    const created = createDataFeeds(library, {
      humanizedSince: (date, now) => humanizedDate(date, now, document.documentElement.lang),
      now: () => new Date(),
    });
    setFeeds(() => created);
    setUploads(created.feedUploads());
    // the page is about to show
    flush();
  }

  // the loader stays when it fails, telling so
  async function loadLibraryThenShowPage() {
    hideLibraryFailure();
    try {
      useLibrary(JSON.parse(await downloadText(clientURLUnified)));
    } catch (error) {
      console.error('The library could not be loaded', error);
      showLibraryFailure(() => void loadLibraryThenShowPage());
      return;
    }
    await showPage();
    removeLoader();
    panel.start();
  }

  window.addEventListener('load', async () => {
    history.scrollRestoration = 'manual';
    alignConnectSideElements();
    followResizing([
      fitted(resizeFeed),
      fitted(resizeStats),
      fitted(resizeProfile),
      fitted(() => panel.resize()),
      alignConnectSideElements,
    ]);
    followSwipes();
    const accountPanel = createAccountPanel('xmlRLoader');
    followAccountPanel(() => void accountPanel.reveal());

    await showLoader();
    await loadLibraryThenShowPage();
  });
}
