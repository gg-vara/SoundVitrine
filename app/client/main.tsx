// Entry of the browser build, on the library page. As a module, it runs before the "load" event that starts client/legacy/
import { render } from '@solidjs/web';
import { createDataFeeds } from './library/data';
import { SearchBand } from './search/SearchBand';
import { ShoutPanel, type ShoutPanelControls } from './shout/ShoutPanel';
import './style.css';

const container = document.getElementById('shoutContainer');
const searchContainer = document.getElementById('searchBand');

if (container && searchContainer) {
  let panel!: ShoutPanelControls;
  let feeds: ReturnType<typeof createDataFeeds> | undefined;

  render(
    () => (
      <ShoutPanel
        controls={controls => {
          panel = controls;
        }}
      />
    ),
    container,
  );
  render(() => <SearchBand search={typed => feeds?.searchBand(typed)} select={updateFilter} />, searchContainer);

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
}
