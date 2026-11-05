// Entry of the browser build, on the library page
import { render } from '@solidjs/web';
import { createSignal, flush } from 'solid-js';
import { createActor } from 'xstate';
import { DiscoverPanel, type DiscoverPanelControls } from './discover/DiscoverPanel';
import { FeedPanel } from './feed/FeedPanel';
import { createDataFeeds, type FeedAlbum, type UnifiedLibrary } from './library/data';
import { SearchBand } from './search/SearchBand';
import { downloadText, hideLibraryFailure, removeLoader, showLibraryFailure, showLoader, showPage } from './shell/loader';
import { startupMachine } from './shell/machine';
import { followScrolling, followSwipes, revealHeaderInReach, setHeaderClasses, withoutFollowingScrolling } from './shell/scrolling';
import { ShoutPanel, type ShoutPanelControls } from './shout/ShoutPanel';
import { StatsPanel, type StatsPanelControls } from './stats/StatsPanel';
import './style.css';

const FEED_ID = 'feedContainer';
const PROFILE_ID = 'profileContainer';
const STATS_ID = 'statsContainer';

const isChecked = (id: string) => (document.getElementById(id) as HTMLInputElement).checked;
const resizeFeed = () => _resizeShutter(FEED_ID, isChecked('showFeed'));
const resizeProfile = () => _resizeShutter(PROFILE_ID, isChecked('showProfile'));
const resizeStats = () => _resizeShutter(STATS_ID, isChecked('showStats'));

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

  // called by client/legacy/, on resizing
  window.resizeShout = () => panel.resize();
  window.revealHeaderInReach = revealHeaderInReach;

  // called by client/legacy/, on scrolling to something
  window.updateHeaderClasses = setHeaderClasses;

  // called by the page and client/legacy/, for what opens and closes under the header
  window.resizeFeed = resizeFeed;
  window.resizeStats = resizeStats;
  window.resizeProfile = resizeProfile;
  window.toggleFeed = () => void withoutFollowingScrolling(_toggleShutter(FEED_ID, resizeFeed).then(vNavigate));
  window.toggleProfile = () => void withoutFollowingScrolling(_toggleShutter(PROFILE_ID, resizeProfile));
  window.toggleStats = () => {
    if (isChecked('showStats')) void stats.open();
    void withoutFollowingScrolling(_toggleShutter(STATS_ID, resizeStats).then(vNavigate));
  };

  function useLibrary(library: UnifiedLibrary) {
    const created = createDataFeeds(library, {
      humanizedSince: compareDateFromNomHumanized,
      now: () => new Date(),
    });
    setFeeds(() => created);
    setUploads(created.feedUploads());
    // the page is about to show
    flush();
  }

  window.addEventListener('load', () => {
    history.scrollRestoration = 'manual';
    alignConnectSideElements();
    bindResizeFunctions();
    followSwipes();
    followScrolling();
    _rLoader = new RLoader('xmlRLoader', initialRLoaderUrl);

    const startup = createActor(startupMachine, {
      input: {
        effects: {
          showLoader,
          loadLibrary: async () => {
            hideLibraryFailure();
            useLibrary(JSON.parse(await downloadText(clientURLUnified)));
          },
          showPage,
          removeLoader,
          startLiveUpdates: () => panel.start(),
          reportFailure: error => {
            console.error('The library could not be loaded', error);
            showLibraryFailure(() => startup.send({ type: 'RETRY' }));
          },
        },
      },
    });
    startup.start();
  });
}
