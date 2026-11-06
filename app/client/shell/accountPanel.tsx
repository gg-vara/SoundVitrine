// The account page, as a panel of the library page
import { createSignal } from 'solid-js';
import { type AccountControls, AccountPage } from '../account/AccountPage';
import { ConnectButton, type Notification } from './ConnectButton';
import { LOGO_CONTENT, LOGO_LOWER, LOGO_UPPER, MAIN_PANEL } from './layout';
import { play } from './motion';

const FADE_SECONDS = 0.5;

const IN_ACCOUNT_PANEL = 'absolute top-4 left-2 z-1 text-black [&_i]:text-[1.2rem] [&_i]:[transform:rotate(180deg)] [&.anima]:text-[#EEE]';

export interface AccountPanelControls {
  // once the panel is in view
  reveal: () => Promise<void>;
}

export function AccountPanel(props: {
  notification: Notification;
  left: () => void;
  dismissNotification: () => void;
  back: () => void;
  controls: (controls: AccountPanelControls) => void;
}) {
  const [lit, setLit] = createSignal(false);
  let panel!: HTMLDivElement;
  let container!: HTMLDivElement;
  let account!: AccountControls;
  let shownOnce = false;

  const fade = (from: number, to: number) => {
    panel.style.opacity = String(to);
    return play(panel, { opacity: [from, to] }, FADE_SECONDS);
  };

  // from what the panel shows to what comes next
  async function change(work: () => void) {
    if (!panel.classList.contains('shown')) return work();
    await fade(1, 0);
    work();
    await fade(0, 1);
  }

  let firstLoad: Promise<boolean>;

  props.controls({
    async reveal() {
      if (shownOnce) return;
      shownOnce = true;

      props.dismissNotification();
      setLit(true);
      document.getElementById('bg')?.classList.add('show');

      container.classList.add('anima');
      const [, loaded] = await Promise.all([play(container, { maxWidth: ['0%', '100%'] }, FADE_SECONDS), firstLoad]);

      if (loaded) {
        panel.classList.add('shown');
        await fade(0, 1);
        panel.style.overflow = 'visible';
      } else {
        // tried again, to show the next time the panel opens
        shownOnce = false;
        firstLoad = account.load();
      }
    },
  });

  return (
    <div id="app-connect" class={`${MAIN_PANEL} h-full items-center overflow-hidden`}>
      <ConnectButton place={IN_ACCOUNT_PANEL} notification={props.notification} left={props.left} lit={lit()} click={props.back} />
      <div
        id="connectContainer"
        class="z-1 flex h-[100vh] max-w-0 flex-col items-center overflow-x-hidden overflow-y-auto [transition:background-color_.5s_ease] [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:bg-transparent [&.anima]:max-w-full [&.anima]:bg-[rgba(0,0,0,.25)] [&.anima]:[border-inline:1px_solid_rgba(255,255,255,.5)] [&>:first-child]:mt-auto! [&>:last-child]:mb-auto!"
        ref={container}
      >
        <div class="flex flex-col items-center bg-[rgba(255,255,255,.5)] p-4 text-center">
          <img src="/public/images/logo.png" width="40%" alt="" />
          <span class="gap-[.2rem] text-[4rem]" style={{ top: '-5%' }}>
            <div class={LOGO_CONTENT}>
              <span class={LOGO_UPPER}>Sound</span>
              <span
                class={`${LOGO_LOWER} [transform:translate(0.5em,3.2em)] after:relative after:top-[-.2em] after:left-[-.4em] after:text-[.7em] after:content-['©']`}
              >
                Vitrine
              </span>
            </div>
          </span>
        </div>
        <div
          id="xmlRLoader"
          class="pointer-events-none flex max-h-0 w-0 flex-col overflow-hidden text-[.75rem] whitespace-nowrap opacity-0 [&.shown]:my-4 [&.shown]:max-h-full [&.shown]:w-full [&.shown]:opacity-100 [&.shown]:[pointer-events:all] [&_button.back]:mt-4 [&_button.back]:text-white [&_button.back]:[background:rgba(0,0,0,.5)] [&_button.back]:[border-block:1px_solid] [&_button.back]:[border-inline:none] [&_h1]:text-[rgba(0,0,0,.8)] [&_hr]:[background:rgba(255,255,255,.75)]"
          ref={panel}
        >
          <AccountPage
            embedded
            change={change}
            controls={given => {
              account = given;
              // loaded ahead, to be there as soon as the panel opens
              firstLoad = given.load();
            }}
          />
        </div>
      </div>
    </div>
  );
}
