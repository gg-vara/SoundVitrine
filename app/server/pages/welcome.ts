// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// The entry of the site : its users, and how to join them

import type { User } from '../auth/users';
import { publicUserFolder } from '../auth/users';
import type { Html } from './html';
import { html, raw } from './html';
import type { PageContext } from './layout';
import { adminPage, pageTitle } from './layout';

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
