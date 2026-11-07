// The account page, as a panel of the library page
import { createSignal } from 'solid-js';
import { ConnectButton, type Notification } from '../shared/ConnectButton';
import { LOGO_CONTENT, LOGO_LOWER, LOGO_UPPER, MAIN_PANEL } from '../shared/layout';
import { play } from '../shared/motion';
import { type AccountControls, AccountPage } from './AccountPage';

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
    <div id="accountPanel" class={`${MAIN_PANEL} h-full items-center overflow-hidden`}>
      <ConnectButton place={IN_ACCOUNT_PANEL} notification={props.notification} left={props.left} lit={lit()} click={props.back} />
      <div
        id="accountColumn"
        class="accountColumn z-1 flex h-[100vh] max-w-0 flex-col items-center overflow-x-hidden overflow-y-auto"
        ref={container}
      >
        <div class="flex flex-col items-center bg-[rgba(255,255,255,.5)] p-4 text-center">
          <img src="/public/images/logo.png" width="40%" alt="" />
          <span class="top-[-5%] gap-[.2rem] text-[4rem]">
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
        <div id="accountContent" class="accountContent" ref={panel}>
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
