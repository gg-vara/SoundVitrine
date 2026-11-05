// The library page of a user, and the page to test live shouts

import { COMPILED_MUSIC_LIB_PROFILE_FILE_NAME, SHOUT_PROFILE_FILE_NAME } from '../config';
import type { Html } from '../html';
import { html, raw } from '../html';
import { findUser, publicUserFolder } from '../users';
import type { PageContext } from './layout';
import { adminScripts, adminStyles, clientScript, colorsCss, externalStyles, filesOf, footer, metadata, pageTitle, wAnim } from './layout';

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
                <div id='searchBand'>
                    <div class='search' data-found="${tr('found')}">
                        <input type='text' aria-label="${tr('phSearch')}" spellcheck="false" placeholder="${tr('phSearch')}" autocomplete="off">
                        <div class='searchResults'></div>
                    </div>
                </div>
            </div>
            ${connectButton(context)}
        </div>
        <div id='profileContainer' class='subFrame'>
            <div class='subContent' data-cat="${tr('profile')}" style='flex-grow:1;display:flex;'>
                <div class='feedWrapper'>
                </div>
            </div>
        </div>
        ${wAnim(user)}
    </header>
    <div id='mainFrame'>
        <div id='shoutContainer' class="subFrame"></div>
        <div id='statsContainer' class='subFrame'>
            <div class='subContent' data-cat="STATS">
                <div class='statsWrapper'>
                    <div id='stats'>
                        <div class='statsPh' id='statsAlbums' data-phid='0' data-def="Albums"></div>
                        <div class='statsPh' id='statsArtists' data-phid='1' data-def="${tr('artists')}"></div>
                    </div>
                    <div id='statsSwitcher'>
                        <div>
                            <label class="clickable" title="Albums">
                                <input id='rAlbums' data-phid='0' type='radio' name='statsS' onchange="switchPanel(event)" checked autocomplete="off">
                                <i class="fas fa-compact-disc"></i>
                                <span>Albums</span>
                            </label>
                        </div>
                        <div>
                            <label class="clickable" title='${tr('artists')}'>
                                <input id='rArtists' data-phid='1' type='radio' name='statsS' onchange="switchPanel(event)" autocomplete="off">
                                <i class="fas fa-users"></i>
                                <span>${tr('artists')}</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div id='feedContainer' class='subFrame'>
            <div class='subContent' data-cat="${tr('whatsnew')}">
                <div class='feedWrapper'></div>
            </div>
        </div>
        <div id='discoverContainer' class='subFrame'>
            <div class='subContent' data-cat='${tr('discover')}'>
                <div class="sorter"></div>
                <div class='filterWrapper'>
                    <div data-sl='Genres' id='genreUI'></div>
                    <div data-sl='${tr('artists')}' id='artistUI'></div>
                    <div data-sl='Albums' id='albumUI'></div>
                </div>
                <div id='albumInfos'>
                    <div class='aiContent'>
                        <div class='hInfos'>
                            <label>${tr('year')}<div id="aYear"></div></label>
                            <label>Genre<div id="aGenre"></div></label>
                            <label>${tr('dateAddition')}<div id="aDateAdded"></div></label>
                        </div>
                        <div class='hMisc'>
                            <div class='imgContainer'>
                                <label>Album<div id="aTitle"></div></label>
                                <div id='aImage' class='imgLoader' data-no-cover-found="${tr('no_cover_found')}"><img onload="imgLoaded(event)" onerror="brokenImg(event)" alt="" /></div>
                            </div>
                            <label style='margin: 1rem 0 1rem 2rem' >${tr('tracks')}<ol id="aTracks"></ol></label>
                        </div>
                        <div class='listen'>
                            <a class='animated' rel="noopener">
                                <i class="fab fa-youtube"></i>
                                <span>${tr('listenTTA')}</span>
                            </a>
                        </div>
                    </div>
                    ${wAnim(user)}
                </div>
            </div>
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
        <script type="text/javascript" src="/public/ext/js/highcharts.js"></script>
        <script type="text/javascript" src="/public/ext/js/moment-with-locales.min.js"></script>
        <script type="text/javascript" src="/public/ext/js/sorttable.js"></script>
        <script type="text/javascript" src="/public/ext/js/hammer.min.js"></script>
        <script type="text/javascript" src="/public/ext/js/mixitup.min.js"></script>
        <script>
            'use strict';

            var clientURLUnified = ${scriptJson(publicUserFolder(user) + COMPILED_MUSIC_LIB_PROFILE_FILE_NAME)};
            var clientURLShout = ${scriptJson(publicUserFolder(user) + SHOUT_PROFILE_FILE_NAME)};

            // server-sent events of the user's shouts (see server/api.ts)
            const shoutStreamUrl = ${scriptJson(`/u/${user}/shouts`)};

            var initialRLoaderUrl = "/account";

            var _discoverFilter = {
                    genreUI : null,
                    artistUI : null,
                    albumUI : null
            };
            var _discoverMixers = {};

            var defFiltStorageKey = "_discoverSorter";
            var _discoverSorter = localStorage.getItem(defFiltStorageKey) || "count:desc";
            var _defaultSorters = {
                    count : "desc",
                    order : "asc"
            };
            var _sortersIconAdapter = {
                    order : "alpha",
                    count : "amount",
                    asc : "up",
                    desc : "down"
            };

            var _appDataFeeds = {};

            var _rLoader = null;
        </script>
        ${adminScripts(context)}
        <script>
            ${raw(filesOf('client/public/ext/js/polyfills'))}
            ${raw(filesOf('client/legacy/explorer/js/misc'))}
            ${raw(filesOf('client/legacy/explorer/js/app'))}
            ${raw(filesOf('client/legacy/explorer/js/app/panels'))}
        </script>
        ${clientScript()}
        ${adminStyles()}
        <style>
            ${raw(filesOf('client/legacy/explorer/css'))}
        </style>
        <style>
            ${raw(colorsCss(user, profile?.customColors))}
        </style>
    </head>
    <body>
        <div id='loader-container'>
            <div id='loader'>
                    <div id='useChrome' class='loading-text'>
                        <img src='/public/images/chrome.svg' alt="Chrome Logo"/>
                        <div style="text-align: center">${tr('worksBest')}</div>
                    </div>
                <div id='loader-bar'></div>
            </div>
        </div>
        <div id='shoutNotificationWidget'>
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
