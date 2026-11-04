// Pages of the admin layout : welcome, account (login, management, creation), library upload

import { APP_NAME, COMPANION_APP_GITHUB_LATEST_RELEASE_URL, COMPANION_APP_NAME, MUSIC_LIB_UPLOAD_FILE_NAME } from '../config';
import type { Html } from '../html';
import { html, raw } from '../html';
import type { User } from '../users';
import { publicUser, publicUserFolder } from '../users';
import type { FormResult, LengthRule, PageContext } from './layout';
import { adminPage, colorsCss, magnifikInput, pageTitle, popup, wAnim } from './layout';

export function welcomePage(context: PageContext, users: Record<string, User>): Html {
  const { tr } = context;
  const content = html`<style>
    #intro-users-descr {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        overflow: auto;
        max-height: 33vh;
        padding: .75em;
        gap: .5em;
    }

    #intro-users-descr .user:hover, .manage_button:hover {
        opacity: .7;
    }

    #intro-users-descr .user, .manage_button {
        transition: opacity .2s;
        border-radius: 5px;
        background-color: white;
        padding: .5em;
        display:flex;
        gap: .5em;
        align-items: center;
        box-shadow: 0px 0px 20px 0px #00000036;
    }
</style>
<div style="display:flex; align-items:center; flex-direction: column; margin: 2rem">
    <img src="/public/images/logo.png" width="60%"/>
    <h1 style="margin: 0; text-align: center">${tr('thisis')}</h1>
    <div style="font-size: .75em; color: #3b3b3b; text-align: center">
        ${raw(tr('project_shorthand_descr', '<img src="/public/images/itunes.png" width="24px" style="margin: 0 .2em; vertical-align: bottom;" />'))}
    </div>
    <br/>
    <div id="intro-users-descr">
        ${Object.entries(users).map(
          ([username, user]) => html`<a href="/u/${username}">
                <div class="user">
                    ${
                      user.profilePic
                        ? html`<img style="max-height: 1.5em; max-width: 1.5em" src="${publicUserFolder(username) + user.profilePic}">`
                        : html`<i class="fas fa-user"></i>`
                    }
                    <span>${username}</span>
                    <i class="fa-solid fa-up-right-from-square" style="font-size: .6em"></i>
                </div>
            </a>`,
        )}
    </div>
    <div style="margin-top: .5em; display: flex; justify-content: center;">
        <a href="/account">
            <div class="manage_button" style="background-color: #23df0d54; box-shadow: 0px 0px 20px 0px white; color: #245724; border: 1px solid #76cd8c;">
                <i class="fa-solid fa-plus"></i>
                <span>${tr('log_createAccount')}</span>
            </div>
        </a>
    </div>
</div>`;

  return adminPage(context, pageTitle(tr('welcome')), content);
}

// a button going to "url" : within the page scripts' loader, unless "leaving"
function buttonLink(context: PageContext, url: string, leaving = false, noBackButton = false): Html {
  const target = context.isXhr && !leaving ? html`href="${url}"` : html`onclick="window.location='${url}'"`;
  return html`${target}${context.isXhr && noBackButton ? ' no-back' : ''}`;
}

function loginForm(context: PageContext, result: FormResult | null): Html {
  const { tr } = context;
  const action = context.url.pathname + context.url.search;
  return html`<h1>${tr('e_log_connect')}</h1>
${popup(result)}
<form method="POST" action="${action}">
    ${magnifikInput(context, { name: 'username', placeholder: 'e_log_username', autocomplete: 'username', required: true })}
    ${magnifikInput(context, { type: 'password', placeholder: 'userPwd', autocomplete: 'current-password', required: true })}
    <input class="hype" type="submit" value="✓ ${tr('validate')}" title="${tr('e_log_connect')}" />
</form>`;
}

function downloadButtons(context: PageContext): Html {
  return html`<div>
    <a target="_blank" href="${COMPANION_APP_GITHUB_LATEST_RELEASE_URL}">
        <div class='companionAppDownloadExplain'>
            <span>
                <span>${context.tr('obtainCompanionApp_1')}</span>
                <span class='obtain'>${COMPANION_APP_NAME}</span>
            </span>
            <span>${context.tr('obtainCompanionApp_2')}</span>
        </div>
    </a>
    <div id="dlContainer"></div>
</div>`;
}

function editors(context: PageContext, user: string): Html {
  const { tr } = context;
  const profilePic = publicUser(user)?.profilePic;
  return html`<div id='EditorWrapper'>
    <div id="bBandEditor" title="${tr('updateBBand')}">
        ${wAnim(user)}
        <div class="colorPicker">
            <div class="controls">
                <input class="cancel" type="button" value="✕" title="${tr('cancel')}"/>
                <input class="validate" type="button" value="✓" title="${tr('validate')}"/>
            </div>
            <div class="colors">
                <input id="color1" type="color" title="" />
                <input id="color2" type="color" title="" />
                <input id="color3" type="color" title="" />
                <input id="color4" type="color" title="" />
            </div>
        </div>
    </div>
    <span id="ProfilePicEditor" title="${tr('updateProfilePic')}">
        <input class="PPPicker" type="file" name="profile_pic" accept="image/*">
        <div class="imgHolder">
            <i class="fas fa-user ph"></i>
            <img class="pp" ${profilePic ? html`src='${publicUserFolder(user) + profilePic}'` : ''} />
        </div>
    </span>
</div>`;
}

// the user's library, from the library the page scripts were on (Referer), as "/u/<user>"
function libraryOfReferer(context: PageContext): string {
  const referer = context.request.headers.get('referer');
  const path = context.isXhr && referer ? URL.parse(referer)?.pathname : context.url.pathname;
  const user = path?.split('/').filter(Boolean)[1] ?? '';
  return `/u/${user}`.toLowerCase();
}

// account : login form, or management of the logged user's account
export function accountPage(context: PageContext, loginResult: FormResult | null): Html {
  const { tr } = context;
  const user = context.session.loggedAs;

  let content: Html;
  if (user) {
    const myLibrary = `/u/${user}`.toLowerCase();
    const isNotMyLibrary = libraryOfReferer(context) !== myLibrary;
    content = html`<div id="accountManagement">
    ${editors(context, user)}
    <div>${tr('welcome_back', user)}</div>
    <div class="loginRack">
        ${
          isNotMyLibrary
            ? html`<button class="hype" ${buttonLink(context, myLibrary, true)}>
                <i class="fas fa-book"></i>
                <span>${tr('log_accessMyLib')}</span>
            </button>`
            : ''
        }
        <button class="hype" ${buttonLink(context, '/account/disconnect', false, true)}>
            <i class="fas fa-power-off"></i>
            <span>${tr('log_disconnect')}</span>
        </button>
    </div>
    ${downloadButtons(context)}
</div>
<style>${raw(colorsCss(user, publicUser(user)?.customColors))}</style>`;
  } else {
    content = html`<div id="accountManagement">
    <div class="loginRack">
        ${loginForm(context, loginResult)}
        <hr/>
        <button class="hype" ${buttonLink(context, '/account/create')}>
            <i class="fas fa-user-circle"></i>
            <span>${tr('log_createAccount')}</span>
        </button>
    </div>
</div>`;
  }

  content = html`${content}
<script>
    let ppe = new PPEditor("ProfilePicEditor");
    let bbe = new BBEditor("bBandEditor");
</script>`;

  return adminPage(context, pageTitle(tr(user ? 'e_log_manage' : 'e_log_home')), content);
}

export const accountRules: Record<'username' | 'password', LengthRule> = {
  username: { min: 6, max: 20 },
  password: { min: 8, max: 20 },
};

export function createAccountPage(context: PageContext, result: FormResult | null): Html {
  const { tr } = context;
  const action = context.url.pathname + context.url.search;
  const content = html`<div id="accountCreation">
    <h1>${tr('e_log_createAccount')}</h1>
    ${popup(result)}
    <form class="loginRack" method="POST" autocomplete="off" action="${action}">
        ${magnifikInput(context, { name: 'username', placeholder: 'e_log_username', required: true, autocomplete: 'username' }, accountRules)}
        ${magnifikInput(context, { type: 'password', placeholder: 'userPwd', required: true, autocomplete: 'current-password' }, accountRules)}
        ${magnifikInput(context, { type: 'email', placeholder: 'e_log_email', required: true })}
        <input class="hype" type="submit" value="✓ ${tr('validate')}" title="${tr('e_log_createAccount')}" />
    </form>
</div>`;

  return adminPage(context, APP_NAME, content);
}

export function uploadPage(context: PageContext): Html {
  const { tr } = context;
  const action = context.url.pathname + context.url.search;
  const content = html`<div style="display: flex; flex-direction: column; align-items: center">
  <h1>${tr('title_uploadMusicLibrary')}</h1>
  <form method="POST" autocomplete="off" enctype="multipart/form-data" action="${action}">
    <input name="${MUSIC_LIB_UPLOAD_FILE_NAME}" type="file" value="" accept=".json,.zmlib" required autocomplete="off" />
    <input autocomplete="current-password" name="password" type="password" placeholder="${tr('userPwd')}" required autocomplete="off" />
    <input class="hype" type="submit" value="${tr('sendFile')}" autocomplete="off" />
  </form>
  <span style="color: grey; font-size: .8em">${tr('or')}</span>
  <br/>
  <a target="_blank" href="${COMPANION_APP_GITHUB_LATEST_RELEASE_URL}">
    <button style="padding: .25em .5em" class="hype" value="${tr('sendFile')}">
      <i class="fa-brands fa-github"></i>
      <span>${tr('uploadWithCompanionApp')}</span>
    </button>
  </a>
</div>`;

  return adminPage(context, pageTitle(tr('title_uploadMusicLibrary')), content);
}
