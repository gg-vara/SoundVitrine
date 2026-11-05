// Entry of the browser build, on the library page. As a module, it runs before the "load" event that starts client/legacy/
import { render } from '@solidjs/web';
import { createSignal } from 'solid-js';
import { FeedPanel } from './feed/FeedPanel';
import { createDataFeeds, type FeedAlbum } from './library/data';
import { SearchBand } from './search/SearchBand';
import { ShoutPanel, type ShoutPanelControls } from './shout/ShoutPanel';
import './style.css';

const FEED_ID = 'feedContainer';
const PROFILE_ID = 'profileContainer';

const isChecked = (id: string) => (document.getElementById(id) as HTMLInputElement).checked;
const resizeFeed = () => _resizeShutter(FEED_ID, isChecked('showFeed'));
const resizeProfile = () => _resizeShutter(PROFILE_ID, isChecked('showProfile'));

const shoutContainer = document.getElementById('shoutContainer');
const searchContainer = document.getElementById('searchBand');
const feedContainer = document.getElementById('feedWrapper');

if (shoutContainer && searchContainer && feedContainer) {
  let panel!: ShoutPanelControls;
  let feeds: ReturnType<typeof createDataFeeds> | undefined;
  const [uploads, setUploads] = createSignal<Record<string, FeedAlbum[]>>({});

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
  render(() => <SearchBand search={typed => feeds?.searchBand(typed)} select={updateFilter} />, searchContainer);
  render(() => <FeedPanel intervals={uploads()} select={updateFilter} />, feedContainer);

  // called by client/legacy/, once the page shows
  window.setupLiveUpdatesForShouts = () => panel.start();
  window.resizeShout = () => panel.resize();

  // called by client/legacy/, once the library is downloaded
  window.generateDataFeeds = library => {
    feeds = createDataFeeds(library, {
      filter: () => _discoverFilter,
      sorter: () => _discoverSorter,
      humanizedSince: compareDateFromNomHumanized,
      now: () => new Date(),
    });
    return feeds;
  };
  window.generateFreshUploads = () => {
    if (feeds) setUploads(feeds.feedUploads());
  };

  // called by the page and client/legacy/, for what opens and closes under the header
  window.resizeFeed = resizeFeed;
  window.toggleFeed = () => void preventSET(_toggleShutter(FEED_ID, resizeFeed).then(vNavigate));
  window.toggleProfile = () => void preventSET(_toggleShutter(PROFILE_ID, resizeProfile));
}
