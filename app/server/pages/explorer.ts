// The library page of a user, and the page to test live shouts

import { COMPILED_MUSIC_LIB_PROFILE_FILE_NAME, SHOUT_PROFILE_FILE_NAME } from '../config';
import type { Html } from '../html';
import { html, raw } from '../html';
import { findUser, publicUserFolder } from '../users';
import type { PageContext } from './layout';
import {
  adminScripts,
  adminStyles,
  clientScript,
  clientStyles,
  colorsCss,
  externalStyles,
  filesOf,
  footer,
  metadata,
  pageTitle,
  wAnim,
} from './layout';

// what it notifies goes with the "notif" class, which the page's scripts remove
const NOTIFICATION =
  '[&.notif]:after:pointer-events-none [&.notif]:after:absolute [&.notif]:after:top-[5%] [&.notif]:after:right-[10%] [&.notif]:after:flex [&.notif]:after:min-h-[1em] [&.notif]:after:min-w-[1em] [&.notif]:after:items-center [&.notif]:after:justify-center [&.notif]:after:rounded-[50%] [&.notif]:after:bg-[red] [&.notif]:after:p-[.1em] [&.notif]:after:text-center [&.notif]:after:text-[.6rem] [&.notif]:after:leading-[0] [&.notif]:after:shadow-[0px_1px_5px_1px_rgba(56,56,56,.2)] [&.notif]:after:content-[attr(data-notif)] [&.notif]:after:[animation-duration:1s] [&.notif]:after:[animation-iteration-count:infinite] [&.notif]:after:[animation-name:bounceIn] [&.notif.notifOut]:after:[animation-fill-mode:forwards]! [&.notif.notifOut]:after:[animation-iteration-count:1]! [&.notif.notifOut]:after:[animation-name:bounceOut]! [&.notif:hover]:after:[animation:none]!';

const CONNECT_BUTTON = `bg-[rgba(255,255,255,.3)] p-[.25rem] [transition:top_.5s] hover:[animation-name:pulse] hover:[animation-duration:1s] hover:[animation-iteration-count:infinite] hover:[animation-fill-mode:forwards] ${NOTIFICATION}`;

// the button opening the account panel, notifying when not logged in. "connect-side" is read by the page's scripts
const connectButton = (
  context: PageContext,
  place: string,
) => html`<div id="${crypto.randomUUID()}" class="connect-side${context.session.loggedAs ? '' : ' notif'} ${CONNECT_BUTTON} ${place}" ${
  context.session.loggedAs ? '' : raw('data-notif="!"')
}>
    <label class='clickable' title="${context.tr('e_log_home')}" onclick="hNavigate()">
        <i class="fas fa-sign-in-alt"></i>
    </label>
</div>`;

// which one shows depends on the orientation of the page
const IN_MENU = 'mr-[.75rem] text-white [&_i]:text-[1.2rem] portrait:hidden! landscape:[display:inherit]!';
const IN_BANNER = 'text-white landscape:hidden! portrait:[display:inherit]!';
const IN_ACCOUNT_PANEL =
  'absolute top-4 left-[.5rem] z-1 text-black [&_i]:text-[1.2rem] [&_i]:[transform:rotate(180deg)] [&.anima]:text-[#EEE]';

// what opens under the header : it closes without a height, which the page's scripts give
const SUB_FRAME = 'flex shrink-0 flex-wrap overflow-hidden [transition:max-height_.3s_ease_0s] not-last:max-h-0';
const SUB_CONTENT = 'flex grow flex-wrap items-start px-4 py-[1.5rem] portrait:flex-col portrait:px-[.75rem] portrait:py-4';
// each one has its own color and position
const CATEGORY =
  "[&::before]:mr-4 [&::before]:mb-4 [&::before]:w-[7.5rem] [&::before]:text-right [&::before]:text-[1.5em] [&::before]:whitespace-nowrap [&::before]:[content:attr(data-cat)_'_||'] portrait:[&::before]:text-left";
const CATEGORY_IN_FLOW = `${CATEGORY} [&::before]:relative`;

// the panels side by side, of which one shows
const MAIN_PANEL = 'flex min-h-0 w-full shrink-0 flex-col';

const LOGO_CONTENT = 'flex flex-col items-center';
const LOGO_UPPER = 'mb-[.25em]';
const LOGO_LOWER = 'absolute text-[.3em] tracking-[.7em]';

function musicLibrary(context: PageContext, user: string, profilePicture: string | undefined): Html {
  const { tr } = context;
  return html`<div id='app-music-library' class="focused ${MAIN_PANEL} bg-[rgb(239,238,238)] opacity-0 [transition:opacity_.5s_ease-in]">
    <header class="top-0 z-10 flex w-full shrink-0 flex-col shadow-[0px_0px_.5rem_#e0e0e0] [transition:all_.2s_ease_0s] [&.sticky]:sticky [&.toHide]:[transform:translateY(-100%)]">
        <div class="flex w-full flex-row items-center">
            <span class="flex h-full items-center justify-center gap-[.2rem] bg-[#f7f7f7] pr-[.25em] pl-[.5em] text-center text-[2.5rem] portrait:hidden">
                <div class="${LOGO_CONTENT}">
                    <span class="${LOGO_UPPER}">Sound</span>
                    <span class="${LOGO_LOWER} [transform:translate(0.3em,3.3em)]">Vitrine</span>
                </div>
                <span class="text-[.5em]">©</span>
            </span>
            <div class="flex grow flex-row flex-wrap items-center justify-between py-[.35rem] hidpi:py-[.75rem] [&>*]:mx-4 [&>*]:my-[.2rem]">
                <div class="grow text-center text-[.8rem] hidpi:text-[1rem] [&_.library]:text-[rgba(0,0,0,.65)] [&_.username]:text-[#EEEEEE]">
                    ${raw(tr('libraryOfHead', html`${user}`.value))}
                </div>
                <div class="flex grow-[10000] justify-between text-[.5rem] text-white [font-family:sans-serif] hidpi:[&_i]:text-[1.3rem] [&_i]:text-[1rem] [&>*]:mx-[.25rem] [&>*]:flex [&>*]:items-center [&>*:first-child]:ml-0 [&>*:last-child]:mr-0">
                    <label class="clickable" title="${tr('users_profile', user)}">
                        <input id='showProfile' type='checkbox' onchange="toggleProfile(event)" autocomplete="off">
                        ${profilePicture ? html`<img class="box-content w-[1rem] rounded-[25%] bg-[#f7f7f7] p-[.2rem]" src="${profilePicture}">` : html`<i class="fas fa-user"></i>`}
                    </label>
                    <label class="clickable" title="${tr('feed')}">
                        <input id='showFeed' type='checkbox' onchange="toggleFeed(event)" autocomplete="off">
                        <i class="fas fa-newspaper"></i>
                    </label>
                    <label class="clickable" title="${tr('stats')}">
                        <input id='showStats' type='checkbox' onchange="toggleStats(event)" autocomplete="off">
                        <i class="fas fa-chart-pie"></i>
                    </label>
                    ${connectButton(context, IN_BANNER)}
                </div>
                <div id='searchBand' class="my-[.35rem]! flex grow-[9001000] justify-center"></div>
            </div>
            ${connectButton(context, IN_MENU)}
        </div>
        <div id='profileContainer' class="${SUB_FRAME} w-full shadow-[1px_.5rem_.5rem_rgb(0,0,0,.05)]">
            <div class="${SUB_CONTENT} ${CATEGORY_IN_FLOW} [&::before]:text-white" data-cat="${tr('profile')}" style='flex-grow:1;display:flex;'></div>
        </div>
        ${wAnim(user)}
    </header>
    <div id='mainFrame' class="justify-start!">
        <div id='shoutContainer' class="${SUB_FRAME} group bg-[#e0e0e0] z-500"></div>
        <div id='statsContainer' class="${SUB_FRAME} bg-[#f9f9f9] shadow-[0px_0px_.05rem_#b7b7b7]">
            <div class="${SUB_CONTENT} ${CATEGORY} min-w-0 [align-items:initial]! [&::before]:absolute [&::before]:text-[grey]" data-cat="STATS">
                <div id='statsWrapper' class='flex min-w-0 flex-1 flex-col'></div>
            </div>
        </div>
        <div id='feedContainer' class="${SUB_FRAME} bg-[#eaeaea] shadow-[0px_0px_.05rem_#b7b7b7]">
            <div class="${SUB_CONTENT} ${CATEGORY_IN_FLOW} [&::before]:text-[grey]" data-cat="${tr('whatsnew')}">
                <div id='feedWrapper' class='grow rounded-[5px] bg-[rgba(255,255,255,.75)] p-4 shadow-[0px_0px_10px_1px_#c7c7c7] columns-[20rem]'></div>
            </div>
        </div>
        <div id='discoverContainer' class="${SUB_FRAME}">
            <div id='discoverContent' class="${SUB_CONTENT} ${CATEGORY_IN_FLOW} [&::before]:text-[grey]" data-cat='${tr('discover')}' data-owner="${user}"></div>
        </div>
    </div>
    ${footer(context)}
</div>`;
}

// JSON in a <script>, which must not close it
const scriptJson = (value: unknown) => raw(JSON.stringify(value).replace(/</g, '\\u003c'));

export function libraryPage(context: PageContext, user: string): Html {
  const { tr } = context;
  const profile = findUser(user);
  const profilePicture = profile?.profilePic ? publicUserFolder(user) + profile.profilePic : undefined;

  return html`<!DOCTYPE html>
<html lang="${context.lang}">
    <head>
        ${metadata(context, pageTitle(tr('libraryOf', user)))}
        ${externalStyles}
        <script type="text/javascript" src="/public/ext/js/moment-with-locales.min.js"></script>
        <script type="text/javascript" src="/public/ext/js/hammer.min.js"></script>
        <script>
            'use strict';

            var clientURLUnified = ${scriptJson(publicUserFolder(user) + COMPILED_MUSIC_LIB_PROFILE_FILE_NAME)};
            var clientURLShout = ${scriptJson(publicUserFolder(user) + SHOUT_PROFILE_FILE_NAME)};

            // server-sent events of the user's shouts (see server/api.ts)
            const shoutStreamUrl = ${scriptJson(`/u/${user}/shouts`)};
        </script>
        ${adminScripts(context)}
        <script>
            ${raw(filesOf('client/public/ext/js/polyfills'))}
        </script>
        ${clientScript()}
        ${adminStyles()}
        <style>
            ${raw(colorsCss(user, profile?.customColors))}
        </style>
        ${clientStyles()}
    </head>
    <body>
        <div id='loader-container' class="pointer-events-none fixed top-0 z-1000 flex h-[100vh] w-[100vw] flex-col items-center justify-center opacity-0 [transition:opacity_.5s_ease]">
            <div class="overflow-hidden">
                    <div id='useChrome' class="mb-[.4rem] flex flex-col items-center gap-[.5em] text-[2em]">
                        <img class="h-[5rem] w-[5rem]" src='/public/images/chrome.svg' alt="Chrome Logo"/>
                        <div style="text-align: center">${tr('worksBest')}</div>
                    </div>
                <div id='libraryFailure' role='alert' hidden class='pointer-events-auto mb-4 flex flex-col items-center gap-2 text-center [&[hidden]]:hidden'>
                    <div>${tr('libraryLoadFailed')}</div>
                    <button type='button' class='cursor-pointer px-3 py-1'>${tr('retry')}</button>
                </div>
                <div id='loader-bar' class="h-[.05rem] w-full grow bg-black shadow-[0px_0px_.5rem_#e4e4e4] [transition:all_.3s_ease_0s] [transform:translateX(-100%)]"></div>
            </div>
        </div>
        <div id='shoutNotificationWidget' class="fixed z-1000 -right-8 top-[4.25rem] py-[.15rem] px-1 bg-white opacity-50 overflow-hidden text-[.7rem] [&.show]:[animation:progNotOut_2s]">
            <i class="fas fa-forward"></i>
        </div>
        <main id="main-app" class="flex w-full [transform:translateX(0px)] [transition:all_.5s_ease-in] hidpi:[transition:all_.25s_ease-in]">
            ${musicLibrary(context, user, profilePicture)}
            <div id='app-connect' class="${MAIN_PANEL} h-full items-center overflow-hidden">
                ${connectButton(context, IN_ACCOUNT_PANEL)}
                <div id="connectContainer" class="z-1 flex h-[100vh] max-w-0 flex-col items-center overflow-x-hidden overflow-y-auto [transition:background-color_.5s_ease,max-width_.5s_ease] [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:bg-transparent [&.anima]:max-w-full [&.anima]:bg-[rgba(0,0,0,.25)] [&.anima]:[border-inline:1px_solid_rgba(255,255,255,.5)] [&>:first-child]:mt-auto! [&>:last-child]:mb-auto!">
                    <div class="flex flex-col items-center bg-[rgba(255,255,255,.5)] p-4 text-center">
                        <img src="/public/images/logo.png" width="40%"/>
                        <span class="gap-[.2rem] text-[4rem]" style="top: -5%">
                            <div class="${LOGO_CONTENT}">
                                <span class="${LOGO_UPPER}">Sound</span>
                                <span class="${LOGO_LOWER} [transform:translate(0.5em,3.2em)] after:relative after:top-[-.2em] after:left-[-.4em] after:text-[.7em] after:content-['©']">Vitrine</span>
                            </div>
                        </span>
                    </div>
                    <div id='xmlRLoader' class="pointer-events-none flex max-h-0 w-0 flex-col overflow-hidden text-[.75rem] whitespace-nowrap opacity-0 [animation-fill-mode:forwards] [transition:width_.5s_ease,max-height_.5s_ease,margin_.5s_ease,opacity_.5s_ease] [&.shown]:my-4 [&.shown]:max-h-full [&.shown]:w-full [&.shown]:opacity-100 [&.shown]:[pointer-events:all] [&_button.back]:mt-4 [&_button.back]:text-white [&_button.back]:[background:rgba(0,0,0,.5)] [&_button.back]:[border-block:1px_solid] [&_button.back]:[border-inline:none] [&_h1]:text-[rgba(0,0,0,.8)] [&_hr]:[background:rgba(255,255,255,.75)]"></div>
                </div>
            </div>
        </main>
        <video id="bg" class="fixed top-0 -z-20 h-[100vh] w-full object-cover opacity-0 [transition:opacity_.5s_ease] [&.show]:opacity-100" muted="true" loop="loop" autoplay="autoplay">
            <source src="/public/videos/bg.mp4" type="video/mp4">
        </video>
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
