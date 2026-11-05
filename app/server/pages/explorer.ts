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

// the button opening the account panel, notifying when not logged in
const connectButton = (
  context: PageContext,
) => html`<div id="${crypto.randomUUID()}" class="connect-side${context.session.loggedAs ? '' : ' notif'}" ${
  context.session.loggedAs ? '' : raw('data-notif="!"')
}>
    <label class='clickable' title="${context.tr('e_log_home')}" onclick="hNavigate()">
        <i class="fas fa-sign-in-alt"></i>
    </label>
</div>`;

function musicLibrary(context: PageContext, user: string, profilePicture: string | undefined): Html {
  const { tr } = context;
  return html`<div id='app-music-library' class="focused">
    <header>
        <div id='menu'>
            <span class='fctr logo'>
                <div class='content'>
                    <span class='upper'>Sound</span>
                    <span class='lower'>Vitrine</span>
                </div>
                <span class='cpr_sign'>©</span>
            </span>
            <div id='banner'>
                <div id='banner-desc'>
                    ${raw(tr('libraryOfHead', html`${user}`.value))}
                </div>
                <div id='banner-side'>
                    <label class="clickable" title="${tr('users_profile', user)}">
                        <input id='showProfile' type='checkbox' onchange="toggleProfile(event)" autocomplete="off">
                        ${profilePicture ? html`<img class='profilepic' src="${profilePicture}">` : html`<i class="fas fa-user"></i>`}
                    </label>
                    <label class="clickable" title="${tr('feed')}">
                        <input id='showFeed' type='checkbox' onchange="toggleFeed(event)" autocomplete="off">
                        <i class="fas fa-newspaper"></i>
                    </label>
                    <label class="clickable" title="${tr('stats')}">
                        <input id='showStats' type='checkbox' onchange="toggleStats(event)" autocomplete="off">
                        <i class="fas fa-chart-pie"></i>
                    </label>
                    ${connectButton(context)}
                </div>
                <div id='searchBand' class="my-[.35rem]! flex grow-[9001000] justify-center"></div>
            </div>
            ${connectButton(context)}
        </div>
        <div id='profileContainer' class='subFrame w-full shadow-[1px_.5rem_.5rem_rgb(0,0,0,.05)]'>
            <div class='subContent [&::before]:text-white' data-cat="${tr('profile')}" style='flex-grow:1;display:flex;'></div>
        </div>
        ${wAnim(user)}
    </header>
    <div id='mainFrame'>
        <div id='shoutContainer' class="subFrame group bg-[#e0e0e0] z-500"></div>
        <div id='statsContainer' class='subFrame bg-[#f9f9f9] shadow-[0px_0px_.05rem_#b7b7b7]'>
            <div class='subContent min-w-0 [align-items:initial]! [&::before]:absolute' data-cat="STATS">
                <div id='statsWrapper' class='flex min-w-0 flex-1 flex-col'></div>
            </div>
        </div>
        <div id='feedContainer' class='subFrame bg-[#eaeaea] shadow-[0px_0px_.05rem_#b7b7b7]'>
            <div class='subContent' data-cat="${tr('whatsnew')}">
                <div id='feedWrapper' class='grow rounded-[5px] bg-[rgba(255,255,255,.75)] p-4 shadow-[0px_0px_10px_1px_#c7c7c7] columns-[20rem]'></div>
            </div>
        </div>
        <div id='discoverContainer' class='subFrame'>
            <div id='discoverContent' class='subContent' data-cat='${tr('discover')}' data-owner="${user}"></div>
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

            var initialRLoaderUrl = "/account";
        </script>
        ${adminScripts(context)}
        <script>
            ${raw(filesOf('client/public/ext/js/polyfills'))}
            ${raw(filesOf('client/legacy/explorer/js/misc'))}
        </script>
        ${clientScript()}
        ${adminStyles()}
        <style>
            ${raw(filesOf('client/legacy/explorer/css'))}
        </style>
        <style>
            ${raw(colorsCss(user, profile?.customColors))}
        </style>
        ${clientStyles()}
    </head>
    <body>
        <div id='loader-container'>
            <div id='loader'>
                    <div id='useChrome' class='loading-text'>
                        <img src='/public/images/chrome.svg' alt="Chrome Logo"/>
                        <div style="text-align: center">${tr('worksBest')}</div>
                    </div>
                <div id='libraryFailure' role='alert' hidden class='pointer-events-auto mb-4 flex flex-col items-center gap-2 text-center [&[hidden]]:hidden'>
                    <div>${tr('libraryLoadFailed')}</div>
                    <button type='button' class='cursor-pointer px-3 py-1'>${tr('retry')}</button>
                </div>
                <div id='loader-bar'></div>
            </div>
        </div>
        <div id='shoutNotificationWidget' class="fixed z-1000 -right-8 top-[4.25rem] py-[.15rem] px-1 bg-white opacity-50 overflow-hidden text-[.7rem] [&.show]:[animation:progNotOut_2s]">
            <i class="fas fa-forward"></i>
        </div>
        <main id="main-app">
            ${musicLibrary(context, user, profilePicture)}
            <div id='app-connect'>
                ${connectButton(context)}
                <div id="connectContainer">
                    <div class="logoContainer">
                        <img src="/public/images/logo.png" width="40%"/>
                        <span class='logo' style="top: -5%">
                            <div class='content'>
                                <span class='upper'>Sound</span>
                                <span class='lower'>Vitrine</span>
                            </div>
                        </span>
                    </div>
                    <div id='xmlRLoader'></div>
                </div>
            </div>
        </main>
        <video id="bg" muted="true" loop="loop" autoplay="autoplay">
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
