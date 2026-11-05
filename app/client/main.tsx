// Entry of the browser build, on the library page. As a module, it runs before the "load" event that starts client/legacy/
import { render } from '@solidjs/web';
import { createDataFeeds } from './library/data';
import { ShoutPanel, type ShoutPanelControls } from './shout/ShoutPanel';
import './style.css';

const container = document.getElementById('shoutContainer');

if (container) {
  let panel!: ShoutPanelControls;
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

  // called by client/legacy/, once the page shows
  window.setupLiveUpdatesForShouts = () => panel.start();
  window.resizeShout = () => panel.resize();

  // called by client/legacy/, once the library is downloaded
  window.generateDataFeeds = library =>
    createDataFeeds(library, {
      filter: () => _discoverFilter,
      sorter: () => _discoverSorter,
      humanizedSince: compareDateFromNomHumanized,
      now: () => new Date(),
    });
}
