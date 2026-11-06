// The library page : its header, what opens under it, and the account panel on its side
import type { JSX } from '@solidjs/web';
import { createSignal } from 'solid-js';
import { filled } from '../library/texts';
import { AccountPanel, type AccountPanelControls } from './accountPanel';
import { ConnectButton, type Notification } from './ConnectButton';
import { LOGO_CONTENT, LOGO_LOWER, LOGO_UPPER, MAIN_PANEL } from './layout';

// which one shows depends on the orientation of the page
const IN_MENU = 'mr-[.75rem] text-white [&_i]:text-[1.2rem] portrait:hidden! landscape:[display:inherit]!';
const IN_BANNER = 'text-white landscape:hidden! portrait:[display:inherit]!';

// what opens under the header : it closes without a height, which shell/navigation.ts gives
const SUB_FRAME = 'flex shrink-0 flex-wrap overflow-hidden not-last:max-h-0';
const SUB_CONTENT = 'flex grow flex-wrap items-start px-4 py-[1.5rem] portrait:flex-col portrait:px-[.75rem] portrait:py-4';
// each one has its own color and position
const CATEGORY =
  "[&::before]:mr-4 [&::before]:mb-4 [&::before]:w-[7.5rem] [&::before]:text-right [&::before]:text-[1.5em] [&::before]:whitespace-nowrap [&::before]:[content:attr(data-cat)_'_||'] portrait:[&::before]:text-left";
const CATEGORY_IN_FLOW = `${CATEGORY} [&::before]:relative`;

// whose texts come in a language that puts the name anywhere
function LibraryOf(props: { user: string }) {
  const [before, after] = (i18n.libraryOfHead ?? '%s').split('%s');
  return (
    <div class="grow text-center text-[.8rem] hidpi:text-[1rem]">
      <span class="text-[rgba(0,0,0,.65)]">{before}</span>
      <span class="text-[#EEEEEE]">{props.user}</span>
      <span class="text-[rgba(0,0,0,.65)]">{after}</span>
    </div>
  );
}

// the server's own footer, as other pages have it
const footer = () => (document.getElementById('footer') as HTMLTemplateElement).content.firstElementChild;

export function LibraryPage(props: {
  shout: JSX.Element;
  search: JSX.Element;
  stats: JSX.Element;
  feed: JSX.Element;
  discover: JSX.Element;
  toggleProfile: () => void;
  toggleFeed: () => void;
  toggleStats: () => void;
  switchPanel: () => void;
  accountControls: (controls: AccountPanelControls) => void;
}) {
  const [notification, setNotification] = createSignal<Notification>(pageData.loggedIn ? 'gone' : 'shown');
  const left = () => setNotification('gone');

  const connectButton = (place: string) => (
    <ConnectButton place={place} notification={notification()} left={left} click={props.switchPanel} />
  );

  return (
    <>
      <main id="main-app" class="flex w-full [transform:translateX(0px)]">
        <div id="app-music-library" class={`focused ${MAIN_PANEL} bg-[rgb(239,238,238)] opacity-0`}>
          <header class="sticky top-0 z-10 flex w-full shrink-0 flex-col shadow-[0px_0px_.5rem_#e0e0e0]">
            <div class="flex w-full flex-row items-center">
              <span class="flex h-full items-center justify-center gap-[.2rem] bg-[#f7f7f7] pr-[.25em] pl-[.5em] text-center text-[2.5rem] portrait:hidden">
                <div class={LOGO_CONTENT}>
                  <span class={LOGO_UPPER}>Sound</span>
                  <span class={`${LOGO_LOWER} [transform:translate(0.3em,3.3em)]`}>Vitrine</span>
                </div>
                <span class="text-[.5em]">©</span>
              </span>
              <div class="flex grow flex-row flex-wrap items-center justify-between py-[.35rem] hidpi:py-[.75rem] [&>*]:mx-4 [&>*]:my-[.2rem]">
                <LibraryOf user={pageData.user} />
                <div class="flex grow-[10000] justify-between text-[.5rem] text-white [font-family:sans-serif] hidpi:[&_i]:text-[1.3rem] [&_i]:text-[1rem] [&>*]:mx-[.25rem] [&>*]:flex [&>*]:items-center [&>*:first-child]:ml-0 [&>*:last-child]:mr-0">
                  <label class="clickable" title={filled(i18n.users_profile, pageData.user)}>
                    <input id="showProfile" type="checkbox" autocomplete="off" onChange={props.toggleProfile} />
                    {pageData.profilePicture ? (
                      <img class="box-content w-[1rem] rounded-[25%] bg-[#f7f7f7] p-[.2rem]" src={pageData.profilePicture} alt="" />
                    ) : (
                      <i class="fas fa-user" />
                    )}
                  </label>
                  <label class="clickable" title={i18n.feed}>
                    <input id="showFeed" type="checkbox" autocomplete="off" onChange={props.toggleFeed} />
                    <i class="fas fa-newspaper" />
                  </label>
                  <label class="clickable" title={i18n.stats}>
                    <input id="showStats" type="checkbox" autocomplete="off" onChange={props.toggleStats} />
                    <i class="fas fa-chart-pie" />
                  </label>
                  {connectButton(IN_BANNER)}
                </div>
                <div id="searchBand" class="my-[.35rem]! flex grow-[9001000] justify-center">
                  {props.search}
                </div>
              </div>
              {connectButton(IN_MENU)}
            </div>
            <div id="profileContainer" class={`${SUB_FRAME} w-full shadow-[1px_.5rem_.5rem_rgb(0,0,0,.05)]`}>
              <div class={`${SUB_CONTENT} ${CATEGORY_IN_FLOW} grow [&::before]:text-white`} data-cat={i18n.profile} />
            </div>
            <div class="wAnim" data-owner={pageData.user} />
          </header>
          <div class="z-0 flex grow flex-col justify-start">
            <div id="shoutContainer" class={`${SUB_FRAME} group z-500 bg-[#e0e0e0]`}>
              {props.shout}
            </div>
            <div id="statsContainer" class={`${SUB_FRAME} bg-[#f9f9f9] shadow-[0px_0px_.05rem_#b7b7b7]`}>
              <div
                class={`${SUB_CONTENT} ${CATEGORY} min-w-0 [align-items:initial]! [&::before]:absolute [&::before]:text-[grey]`}
                data-cat="STATS"
              >
                <div class="flex min-w-0 flex-1 flex-col">{props.stats}</div>
              </div>
            </div>
            <div id="feedContainer" class={`${SUB_FRAME} bg-[#eaeaea] shadow-[0px_0px_.05rem_#b7b7b7]`}>
              <div class={`${SUB_CONTENT} ${CATEGORY_IN_FLOW} [&::before]:text-[grey]`} data-cat={i18n.whatsnew}>
                <div class="grow columns-[20rem] rounded-[5px] bg-[rgba(255,255,255,.75)] p-4 shadow-[0px_0px_10px_1px_#c7c7c7]">
                  {props.feed}
                </div>
              </div>
            </div>
            <div id="discoverContainer" class={SUB_FRAME}>
              <div id="discoverContent" class={`${SUB_CONTENT} ${CATEGORY_IN_FLOW} [&::before]:text-[grey]`} data-cat={i18n.discover}>
                {props.discover}
              </div>
            </div>
          </div>
          {footer()}
        </div>
        <AccountPanel
          notification={notification()}
          left={left}
          dismissNotification={() => {
            if (notification() === 'shown') setNotification('leaving');
          }}
          back={props.switchPanel}
          controls={props.accountControls}
        />
      </main>
      <video
        id="bg"
        class="fixed top-0 -z-20 h-[100vh] w-full object-cover opacity-0 [transition:opacity_.5s_ease] [&.show]:opacity-100"
        muted
        loop
        autoplay
        src="/public/videos/bg.mp4"
      />
    </>
  );
}
