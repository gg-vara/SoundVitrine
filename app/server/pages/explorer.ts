// The library page of a user, and the page to test live shouts

import { COMPILED_MUSIC_LIB_PROFILE_FILE_NAME, SHOUT_PROFILE_FILE_NAME } from '../config';
import type { Html } from '../html';
import { html, raw } from '../html';
import { findUser, publicUserFolder } from '../users';
import type { PageContext } from './layout';
import {
  clientScript,
  clientStyles,
  colorsCss,
  defaultColorsStyle,
  externalStyles,
  footer,
  metadata,
  pageTitle,
  scriptJson,
  translationsScript,
} from './layout';

// what the browser renders (client/shell/LibraryPage.tsx) : only the loader comes with the page, as it must show before any script runs,
// and the footer, as the other pages have it
export function libraryPage(context: PageContext, user: string): Html {
  const { tr } = context;
  const profile = findUser(user);
  const profilePicture = profile?.profilePic ? publicUserFolder(user) + profile.profilePic : undefined;

  return html`<!DOCTYPE html>
<html lang="${context.lang}">
    <head>
        ${metadata(context, pageTitle(tr('libraryOf', user)))}
        ${externalStyles}
        ${translationsScript(context)}
        <script>
            const pageData = ${scriptJson({
              user,
              profilePicture,
              loggedIn: Boolean(context.session.loggedAs),
              libraryUrl: publicUserFolder(user) + COMPILED_MUSIC_LIB_PROFILE_FILE_NAME,
              shoutUrl: publicUserFolder(user) + SHOUT_PROFILE_FILE_NAME,
              // server-sent events of the user's shouts (see server/api.ts)
              shoutStreamUrl: `/u/${user}/shouts`,
            })};
        </script>
        ${clientScript()}
        ${defaultColorsStyle()}
        <style>
            ${raw(colorsCss(user, profile?.customColors))}
        </style>
        ${clientStyles()}
    </head>
    <body>
        <div id='loader' class="pointer-events-none fixed top-0 z-1000 flex h-[100vh] w-[100vw] flex-col items-center justify-center opacity-0">
            <div class="overflow-hidden">
                    <div id='useChrome' class="mb-[.4rem] flex flex-col items-center gap-[.5em] text-[2em]">
                        <img class="h-20 w-20" src='/public/images/chrome.svg' alt="Chrome Logo"/>
                        <div class="text-center">${tr('worksBest')}</div>
                    </div>
                <div id='libraryFailure' role='alert' hidden class='pointer-events-auto mb-4 flex flex-col items-center gap-2 text-center [&[hidden]]:hidden'>
                    <div>${tr('libraryLoadFailed')}</div>
                    <button type='button' class='cursor-pointer px-3 py-1'>${tr('retry')}</button>
                </div>
                <div id='loaderBar' class="h-[.05rem] w-full grow bg-black shadow-[0px_0px_.5rem_#e4e4e4] [transition:all_.3s_ease_0s] [transform:translateX(-100%)]"></div>
            </div>
        </div>
        <div id='shoutWidget' class="fixed z-1000 -right-8 top-17 py-[.15rem] px-1 bg-white opacity-50 overflow-hidden text-[.7rem] [&.show]:[animation:progNotOut_2s]">
            <i class="fas fa-forward"></i>
        </div>
        <div id="library" class="contents"></div>
        <template id="footer">${footer(context)}</template>
    </body>
</html>`;
}

// sends a test shout to a user, and subscribes to the user's shouts
export function mockPage(context: PageContext): Html {
  const base = context.url.pathname.replace(/\/$/, '');
  return html`<!DOCTYPE html>
<html lang="${context.lang}">
    <head>
        <script>
            const sendEvent = async userToSendEventTo => {
                await fetch(${scriptJson(`${base}/send`)}, {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({ toUser: userToSendEventTo }),
                });
            };

            const subscribeSSE = userToSubscribeTo => {
                const source = new EventSource("/u/" + userToSubscribeTo + "/shouts");
                source.onmessage = event => console.log("shout", JSON.parse(event.data));
                return source;
            };

            document.onreadystatechange = () => {
                const username = "test";
                document.getElementById("send-event").onclick = () => sendEvent(username);
                document.getElementById("subscribe").onclick = () => subscribeSSE(username);
            };
        </script>
    </head>
    <body>
        <button id="send-event">Send Event</button>
        <button id="subscribe">Subscribe</button>
    </body>
</html>`;
}
