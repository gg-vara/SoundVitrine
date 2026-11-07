// Pages of the admin layout : welcome, account, library upload

import type { User } from '../auth/users';
import { publicUserFolder } from '../auth/users';
import { COMPANION_APP_GITHUB_LATEST_RELEASE_URL, MUSIC_LIB_UPLOAD_FILE_NAME } from '../config';
import type { Html } from './html';
import { html, raw } from './html';
import type { PageContext } from './layout';
import { ACCOUNT_ENTRY, adminPage, clientScript, pageTitle, translationsScript } from './layout';

export function welcomePage(context: PageContext, users: User[]): Html {
  const { tr } = context;
  const content = html`<div class="m-8 flex flex-col items-center">
    <img src="/public/images/logo.png" width="60%"/>
    <h1 class="m-0 text-center">${tr('thisis')}</h1>
    <div class="text-center text-[.75em] text-[#3b3b3b]">
        ${raw(tr('project_shorthand_descr', '<img src="/public/images/itunes.png" width="24px" class="mx-[.2em] my-0 align-bottom" />'))}
    </div>
    <br/>
    <div class="flex max-h-[33vh] flex-wrap items-center justify-center gap-[.5em] overflow-auto p-[.75em]">
        ${users.map(
          ({ username, profilePic }) => html`<a href="/u/${username}">
                <div class="welcomeLink">
                    ${
                      profilePic
                        ? html`<img class="max-h-[1.5em] max-w-[1.5em]" src="${publicUserFolder(username) + profilePic}">`
                        : html`<i class="fas fa-user"></i>`
                    }
                    <span>${username}</span>
                    <i class="fa-solid fa-up-right-from-square text-[.6em]"></i>
                </div>
            </a>`,
        )}
    </div>
    <div class="mt-[.5em] flex flex-wrap justify-center gap-[.5em]">
        <a href="/account">
            <div class="welcomeLink border border-[#76cd8c] bg-[#23df0d54]! text-[#245724] shadow-[0px_0px_20px_0px_white]!">
                <i class="fa-solid fa-plus"></i>
                <span>${tr('log_createAccount')}</span>
            </div>
        </a>
        <a href="/api/docs">
            <div class="welcomeLink">
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
  const content = html`<div class="flex flex-col items-center">
  <h1>${tr('title_uploadMusicLibrary')}</h1>
  <form method="POST" autocomplete="off" enctype="multipart/form-data" action="${action}">
    <input name="${MUSIC_LIB_UPLOAD_FILE_NAME}" type="file" value="" accept=".json,.zmlib" required autocomplete="off" />
    <input class="textInput" autocomplete="current-password" name="password" type="password" placeholder="${tr('userPwd')}" required autocomplete="off" />
    <input class="submitButton" type="submit" value="${tr('sendFile')}" autocomplete="off" />
  </form>
  <span class="text-[.8em] text-[grey]">${tr('or')}</span>
  <br/>
  <a target="_blank" href="${COMPANION_APP_GITHUB_LATEST_RELEASE_URL}">
    <button class="actionButton px-[.5em]! py-[.25em]!" value="${tr('sendFile')}">
      <i class="fa-brands fa-github"></i>
      <span>${tr('uploadWithCompanionApp')}</span>
    </button>
  </a>
</div>`;

  return adminPage(context, pageTitle(tr('title_uploadMusicLibrary')), content);
}
