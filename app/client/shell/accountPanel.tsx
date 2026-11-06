// The account page, as a panel of the library page
import { render } from '@solidjs/web';
import { type AccountControls, AccountPage } from '../account/AccountPage';
import { waitAnimationEnd, waitTransitionEnd } from './waiting';

export function createAccountPanel(elementId: string) {
  const panel = document.getElementById(elementId) as HTMLElement;
  let controls!: AccountControls;
  let shownOnce = false;

  const fadeIn = () =>
    waitTransitionEnd(panel, () => panel.classList.add('shown')).then(() => {
      panel.style.overflow = 'visible';
    });

  const fadeOut = () => {
    panel.style.overflow = '';
    return waitTransitionEnd(panel, () => panel.classList.remove('shown'));
  };

  async function change(work: () => void) {
    if (!panel.classList.contains('shown')) return work();
    await fadeOut();
    work();
    await fadeIn();
  }

  render(
    () => (
      <AccountPage
        embedded
        change={change}
        controls={given => {
          controls = given;
        }}
      />
    ),
    panel,
  );

  // loaded ahead, to be there as soon as the panel opens
  let firstLoad = controls.load();

  return {
    // once the panel is in view
    async reveal() {
      if (shownOnce) return;
      shownOnce = true;

      for (const button of document.querySelectorAll('.connect-side.notif')) {
        void waitAnimationEnd(button, () => button.classList.add('notifOut'), '::after').then(() => {
          button.classList.remove('notif', 'notifOut');
        });
      }
      document.querySelector('#app-connect .connect-side')?.classList.add('anima');
      document.getElementById('bg')?.classList.add('show');

      const container = document.getElementById('connectContainer') as HTMLElement;
      const [, loaded] = await Promise.all([waitTransitionEnd(container, () => container.classList.add('anima')), firstLoad]);

      if (loaded) await fadeIn();
      else {
        // tried again, to show the next time the panel opens
        shownOnce = false;
        firstLoad = controls.load();
      }
    },
  };
}
