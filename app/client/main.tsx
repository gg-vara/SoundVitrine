// Entry of the browser build, on the library page

import { render } from '@solidjs/web';
import { createSignal, flush } from 'solid-js';
import { DiscoverPanel, type DiscoverPanelControls } from './discover/DiscoverPanel';
import { FeedPanel } from './feed/FeedPanel';
import { createDataFeeds, type FeedAlbum, type UnifiedLibrary } from './library/data';
import { humanizedDate } from './library/humanizedDate';
import { SearchBand } from './search/SearchBand';
import type { AccountPanelControls } from './shell/accountPanel';
import { LibraryPage } from './shell/LibraryPage';
import { downloadText, hideLibraryFailure, removeLoader, showLibraryFailure, showLoader, showPage } from './shell/loader';
import {
  alignConnectSideElements,
  fitShutter,
  followAccountPanel,
  followResizing,
  followSwipes,
  scrollToElement,
  setShutter,
  switchPanel,
} from './shell/navigation';
import { ShoutPanel, type ShoutPanelControls } from './shout/ShoutPanel';
import { StatsPanel, type StatsPanelControls } from './stats/StatsPanel';
import './style.css';

const FEED_ID = 'feedContainer';
const PROFILE_ID = 'profileContainer';
const STATS_ID = 'statsContainer';

const isChecked = (id: string) => (document.getElementById(id) as HTMLInputElement).checked;
const fitting = (id: string, checkbox: string) => () => fitShutter(id, isChecked(checkbox));

let shout!: ShoutPanelControls;
let stats!: StatsPanelControls;
let discover!: DiscoverPanelControls;
let account!: AccountPanelControls;
const [feeds, setFeeds] = createSignal<ReturnType<typeof createDataFeeds>>();
const [uploads, setUploads] = createSignal<Record<string, FeedAlbum[]>>({});

// what the search bar and the feed offer holds, on its element, the filters to apply
const selectFromElement = (event: Event) => {
  discover.select(JSON.parse((event.currentTarget as HTMLElement).dataset.nFilter ?? '{}'));
};

render(
  () => (
    <LibraryPage
      shout={
        <ShoutPanel
          controls={controls => {
            shout = controls;
          }}
        />
      }
      search={<SearchBand search={typed => feeds()?.searchBand(typed)} select={selectFromElement} />}
      stats={
        <StatsPanel
          counts={() => {
            const library = feeds();
            return library && { albums: library.statsAlbums(), artists: library.statsArtists() };
          }}
          controls={controls => {
            stats = controls;
          }}
        />
      }
      feed={<FeedPanel intervals={uploads()} select={selectFromElement} />}
      discover={
        <DiscoverPanel
          feeds={feeds()}
          owner={pageData.user}
          controls={controls => {
            discover = controls;
          }}
        />
      }
      toggleProfile={() => void setShutter(PROFILE_ID, isChecked('showProfile'))}
      toggleFeed={() => void setShutter(FEED_ID, isChecked('showFeed')).then(scrollToElement)}
      toggleStats={() => {
        if (isChecked('showStats')) void stats.open();
        void setShutter(STATS_ID, isChecked('showStats')).then(scrollToElement);
      }}
      switchPanel={() => switchPanel()}
      accountControls={controls => {
        account = controls;
      }}
    />
  ),
  document.getElementById('library') as HTMLElement,
);

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
    useLibrary(JSON.parse(await downloadText(pageData.libraryUrl)));
  } catch (error) {
    console.error('The library could not be loaded', error);
    showLibraryFailure(() => void loadLibraryThenShowPage());
    return;
  }
  await showPage();
  removeLoader();
  shout.start();
}

window.addEventListener('load', async () => {
  history.scrollRestoration = 'manual';
  alignConnectSideElements();
  followResizing([
    fitting(FEED_ID, 'showFeed'),
    fitting(STATS_ID, 'showStats'),
    fitting(PROFILE_ID, 'showProfile'),
    () => shout.resize(),
    alignConnectSideElements,
  ]);
  followSwipes();
  followAccountPanel(() => void account.reveal());

  await showLoader();
  await loadLibraryThenShowPage();
});
