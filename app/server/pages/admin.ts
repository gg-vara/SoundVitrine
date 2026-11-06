// Pages of the admin layout : welcome, account, library upload

import { COMPANION_APP_GITHUB_LATEST_RELEASE_URL, MUSIC_LIB_UPLOAD_FILE_NAME } from '../config';
import type { Html } from '../html';
import { html, raw } from '../html';
import type { User } from '../users';
import { publicUserFolder } from '../users';
import { HYPE_BUTTON, HYPE_SUBMIT, TEXT_INPUT } from './controls';
import type { PageContext } from './layout';
import { ACCOUNT_ENTRY, adminPage, clientScript, pageTitle, translationsScript } from './layout';

export function welcomePage(context: PageContext, users: User[]): Html {
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
        ${users.map(
          ({ username, profilePic }) => html`<a href="/u/${username}">
                <div class="user">
                    ${
                      profilePic
                        ? html`<img style="max-height: 1.5em; max-width: 1.5em" src="${publicUserFolder(username) + profilePic}">`
                        : html`<i class="fas fa-user"></i>`
                    }
                    <span>${username}</span>
                    <i class="fa-solid fa-up-right-from-square" style="font-size: .6em"></i>
                </div>
            </a>`,
        )}
    </div>
    <div style="margin-top: .5em; display: flex; justify-content: center; flex-wrap: wrap; gap: .5em;">
        <a href="/account">
            <div class="manage_button" style="background-color: #23df0d54; box-shadow: 0px 0px 20px 0px white; color: #245724; border: 1px solid #76cd8c;">
                <i class="fa-solid fa-plus"></i>
                <span>${tr('log_createAccount')}</span>
            </div>
        </a>
        <a href="/api/docs">
            <div class="manage_button">
                <i class="fa-solid fa-code"></i>
                <span>${tr('api_docs')}</span>
            </div>
        </a>
    </div>
</div>`;

  return adminPage(context, pageTitle(tr('welcome')), content);
}

// what the browser renders, from GET /account/me (client/account/)
export function accountPage(context: PageContext): Html {
  const { tr } = context;
  const content = html`<div id="account" class="contents"></div>${translationsScript(context)}${clientScript(ACCOUNT_ENTRY)}`;
  return adminPage(context, pageTitle(tr(context.session.loggedAs ? 'e_log_manage' : 'e_log_home')), content);
}

export function uploadPage(context: PageContext): Html {
  const { tr } = context;
  const action = context.url.pathname + context.url.search;
  const content = html`<div style="display: flex; flex-direction: column; align-items: center">
  <h1>${tr('title_uploadMusicLibrary')}</h1>
  <form method="POST" autocomplete="off" enctype="multipart/form-data" action="${action}">
    <input name="${MUSIC_LIB_UPLOAD_FILE_NAME}" type="file" value="" accept=".json,.zmlib" required autocomplete="off" />
    <input class="${TEXT_INPUT}" autocomplete="current-password" name="password" type="password" placeholder="${tr('userPwd')}" required autocomplete="off" />
    <input class="${HYPE_SUBMIT}" type="submit" value="${tr('sendFile')}" autocomplete="off" />
  </form>
  <span style="color: grey; font-size: .8em">${tr('or')}</span>
  <br/>
  <a target="_blank" href="${COMPANION_APP_GITHUB_LATEST_RELEASE_URL}">
    <button style="padding: .25em .5em" class="${HYPE_BUTTON}" value="${tr('sendFile')}">
      <i class="fa-brands fa-github"></i>
      <span>${tr('uploadWithCompanionApp')}</span>
    </button>
  </a>
</div>`;

  return adminPage(context, pageTitle(tr('title_uploadMusicLibrary')), content);
}
