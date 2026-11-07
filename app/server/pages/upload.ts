// What a user without library gets

import { COMPANION_APP_GITHUB_LATEST_RELEASE_URL, MUSIC_LIB_UPLOAD_FILE_NAME } from '../config';
import type { Html } from './html';
import { html } from './html';
import type { PageContext } from './layout';
import { adminPage, pageTitle } from './layout';

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
