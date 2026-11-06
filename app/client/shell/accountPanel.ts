// The account panel : shows the account pages of the server, whose links and forms stay within it

import { startEditors } from '../account/editors';
import { type AccountHistory, firstHistory, historyAfter } from './accountHistory';
import { waitAnimationEnd, waitTransitionEnd } from './waiting';

interface Loaded {
  content: string;
  url: string;
}

async function fetchPage(method: string, url: string, body?: FormData): Promise<Loaded> {
  // the header asks for the content only, without the rest of the page
  const response = await fetch(url, { method, body, headers: { 'X-Requested-With': 'XMLHttpRequest' } });
  if (!response.ok) throw new Error(`${method} ${url} : ${response.status}`);
  return { content: await response.text(), url: response.url };
}

export interface AccountPanel {
  // once the panel is in view
  reveal(): Promise<void>;
}

export function createAccountPanel(elementId: string, firstUrl: string): AccountPanel {
  const panel = document.getElementById(elementId) as HTMLElement;
  let history: AccountHistory = firstHistory(firstUrl);
  let revealed = false;

  const fadeIn = () =>
    waitTransitionEnd(panel, () => panel.classList.add('shown')).then(() => {
      panel.style.overflow = 'visible';
    });

  const fadeOut = () => {
    panel.style.overflow = '';
    return waitTransitionEnd(panel, () => panel.classList.remove('shown'));
  };

  async function go(method: string, url: string, body?: FormData, wantsBack = false) {
    const [loaded] = await Promise.allSettled([fetchPage(method, url, body), fadeOut()]);

    // what it showed stays, rather than an empty panel
    if (loaded.status === 'rejected') console.error('The account page could not be loaded', loaded.reason);
    else {
      history = historyAfter(history, loaded.value.url, wantsBack);
      fill(loaded.value.content);
    }

    void fadeIn();
  }

  function addBackButton() {
    const button = document.createElement('button');
    button.textContent = `<< ${i18n.back}`;
    button.title = i18n.back ?? '';
    button.classList.add('back');
    button.onclick = event => {
      event.preventDefault();
      void go('GET', history.previous ?? firstUrl);
    };
    panel.appendChild(button);
  }

  function followLinksAndForm() {
    panel.querySelectorAll('button[href]').forEach(button => {
      const url = button.getAttribute('href') as string;
      (button as HTMLElement).onclick = event => {
        event.preventDefault();
        void go('GET', url, undefined, !button.hasAttribute('no-back'));
      };
      button.removeAttribute('href');
    });

    const form = panel.querySelector('form');
    if (form) {
      form.onsubmit = event => {
        event.preventDefault();
        void go(form.getAttribute('method') as string, form.getAttribute('action') as string, new FormData(form));
      };
    }
  }

  function fill(content: string) {
    if (!content) return;

    // the server's own pages, which escape what they show
    panel.innerHTML = content;
    if (history.showBack) addBackButton();
    followLinksAndForm();

    startEditors();
  }

  const loadFirstPage = () =>
    fetchPage('GET', history.current).then(
      ({ content }) => {
        fill(content);
        return true;
      },
      error => {
        console.error('The account page could not be loaded', error);
        return false;
      },
    );

  // loaded ahead, to be there as soon as the panel opens
  let firstPage = loadFirstPage();

  return {
    async reveal() {
      if (revealed) return;
      revealed = true;

      for (const button of document.querySelectorAll('.connect-side.notif')) {
        void waitAnimationEnd(button, () => button.classList.add('notifOut'), '::after').then(() => {
          button.classList.remove('notif', 'notifOut');
        });
      }
      document.querySelector('#app-connect .connect-side')?.classList.add('anima');
      document.getElementById('bg')?.classList.add('show');

      const container = document.getElementById('connectContainer') as HTMLElement;
      const [, loaded] = await Promise.all([waitTransitionEnd(container, () => container.classList.add('anima')), firstPage]);

      if (loaded) await fadeIn();
      else {
        // tried again, to show the next time the panel opens
        revealed = false;
        firstPage = loadFirstPage();
      }
    },
  };
}
