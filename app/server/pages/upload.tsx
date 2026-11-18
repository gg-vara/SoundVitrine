// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// What a user without library gets : its owner, logged in, uploads one; anyone else is asked to log in as them

import { COMPANION_APP_GITHUB_LATEST_RELEASE_URL, MUSIC_LIB_UPLOAD_FILE_NAME } from '../config';
import type { PageContext } from './layout';
import { AdminPage, pageTitle } from './layout';

export function uploadPage(context: PageContext, user: string, refusal?: string) {
  const { tr } = context;
  const owner = context.session.loggedAs === user;

  return (
    <AdminPage context={context} title={pageTitle(tr('title_uploadMusicLibrary'))}>
      <div class="flex flex-col items-center">
        <h1>{tr('title_uploadMusicLibrary')}</h1>
        {refusal ? (
          <p role="alert" class="text-[#b00020]">
            {refusal}
          </p>
        ) : null}
        {owner ? (
          <form method="post" autocomplete="off" enctype="multipart/form-data" action={`/u/${user}`}>
            <input name={MUSIC_LIB_UPLOAD_FILE_NAME} type="file" value="" accept=".json,.zmlib" required autocomplete="off" />
            <input class="submitButton" type="submit" value={tr('sendFile')} autocomplete="off" />
          </form>
        ) : (
          <a href="/account">{tr('upload_log_in', user)}</a>
        )}
        <span class="text-[.8em] text-[grey]">{tr('or')}</span>
        <br />
        <a target="_blank" href={COMPANION_APP_GITHUB_LATEST_RELEASE_URL} rel="noopener">
          <button type="button" class="actionButton px-[.5em]! py-[.25em]!" value={tr('sendFile')}>
            <i class="fa-brands fa-github"></i>
            <span>{tr('uploadWithCompanionApp')}</span>
          </button>
        </a>
      </div>
    </AdminPage>
  );
}
