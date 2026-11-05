// Entry of the browser build, on the library page. As a module, it runs before the "load" event that starts client/legacy/
import { render } from '@solidjs/web';
import { createSignal, flush } from 'solid-js';
import { DiscoverPanel, type DiscoverPanelControls } from './discover/DiscoverPanel';
import { FeedPanel } from './feed/FeedPanel';
import { createDataFeeds, type FeedAlbum } from './library/data';
import { SearchBand } from './search/SearchBand';
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

  // called by client/legacy/, once the page shows
  window.setupLiveUpdatesForShouts = () => panel.start();
  window.resizeShout = () => panel.resize();

  // called by client/legacy/, once the library is downloaded
  window.generateDataFeeds = library => {
    setFeeds(() =>
      createDataFeeds(library, {
        humanizedSince: compareDateFromNomHumanized,
        now: () => new Date(),
      }),
    );
    // what comes next reads it, and shows the page
    flush();
  };
  window.generateFreshUploads = () => {
    const library = feeds();
    if (library) setUploads(library.feedUploads());
  };

  // called by the page and client/legacy/, for what opens and closes under the header
  window.resizeFeed = resizeFeed;
  window.toggleFeed = () => void preventSET(_toggleShutter(FEED_ID, resizeFeed).then(vNavigate));
  window.toggleProfile = () => void preventSET(_toggleShutter(PROFILE_ID, resizeProfile));
  window.toggleStats = () => {
    if (isChecked('showStats')) void stats.open();
    void preventSET(_toggleShutter(STATS_ID, resizeStats).then(vNavigate));
  };
}
