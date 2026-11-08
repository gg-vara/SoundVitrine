// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// Parts shared by the pages : metadata, footer, the browser build. In hono/jsx, which escapes what it interpolates : only
// dangerouslySetInnerHTML takes HTML, scripts and styles as they are

import { basename } from 'node:path';
import type { Child } from 'hono/jsx';
import type { Session } from '../auth/session';
import { APP_NAME, APP_VERSION, DEFAULT_BACKGROUND_COLORS, ENFORCE_CANONICAL_HTTP_SCHEME } from '../config';
import { clientEntries, embedded } from '../embedded';
import type { Lang, TranslationKey, Translator } from '../i18n/i18n';
import { dictionaries } from '../i18n/i18n';

// what a page is rendered from
export interface PageContext {
  request: Request;
  url: URL;
  session: Session;
  clientIp: string;
  lang: Lang;
  tr: Translator;
  // posted fields, to fill the form back
  form: Record<string, string>;
}

//
// The browser build
//

// the files of Vite's entry, relative to client/dist/
export interface ClientEntry {
  file: string;
  css?: string[];
}

// the entries of Vite's build (vite.config.ts) : the library page's, and the account page's when it stands alone
export const LIBRARY_ENTRY = 'library/main.tsx';
export const ACCOUNT_ENTRY = 'account/main.tsx';

// the script of Vite's build : without it, the page misses what moved there
export function ClientScript({ name = LIBRARY_ENTRY }: { name?: string }) {
  const entry: ClientEntry | undefined = clientEntries[name];
  return entry ? <script type="module" src={`/web/${entry.file}`} /> : null;
}

export function ClientStyles() {
  return (
    <>
      {(clientEntries[LIBRARY_ENTRY]?.css ?? []).map(file => (
        <link rel="stylesheet" href={`/web/${file}`} />
      ))}
    </>
  );
}

//
// Shards
//

// the animated band colors : of "owner", else the default ones
export function colorsCss(owner?: string, colors?: string[]): string {
  const target = owner && colors ? `[data-owner="${owner}"]` : '';
  const [a, b, c, d] = owner && colors ? colors : DEFAULT_BACKGROUND_COLORS;
  return `.band${target}::after { background: linear-gradient(-45deg, ${a}, ${b}, ${c}, ${d});}`;
}

// JSON in a <script>, which must not close it
export const scriptJson = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

// a script or a style as it is : what it holds is code, not text
export const Script = ({ code }: { code: string }) => <script dangerouslySetInnerHTML={{ __html: code }} />;
export const Style = ({ css }: { css: string }) => <style dangerouslySetInnerHTML={{ __html: css }} />;

//
// Head and footer
//

function canonicalHost(request: Request): string {
  const headers = request.headers;
  const scheme = headers.get('x-forwarded-proto') || (ENFORCE_CANONICAL_HTTP_SCHEME ? 'http' : 'https');
  const host = headers.get('x-forwarded-host') || headers.get('host') || new URL(request.url).host;
  return `${scheme}://${host}`;
}

export function Metadata({ context, title }: { context: PageContext; title: string }) {
  const description = context.tr('app_descr');
  const host = canonicalHost(context.request);
  const image = `${host}/public/images/og_image.png`;
  const url = host + context.url.pathname + context.url.search;

  return (
    <>
      <meta charset="UTF-8" />
      <title>{title}</title>
      <link rel="icon" type="image/png" href="/public/favicon/favicon-96x96.png" sizes="96x96" />
      <link rel="shortcut icon" href="/public/favicon/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/public/favicon/apple-touch-icon.png" />
      <link rel="manifest" href="/public/favicon/site.webmanifest" />
      <meta name="description" content={description} />
      <meta name="theme-color" content="#efefef" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:width" content="256" />
      <meta property="og:image:height" content="256" />
      <meta property="og:type" content="website" />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:card" content="photo" />
    </>
  );
}

// "SoundVitrine - <subtitle>"
export const pageTitle = (subtitle?: string) => (subtitle ? `${APP_NAME} - ${subtitle}` : APP_NAME);

export const ExternalStyles = () => (
  <>
    <link rel="stylesheet" href="https://use.fontawesome.com/releases/v6.4.2/css/solid.css" async />
    <link rel="stylesheet" href="https://use.fontawesome.com/releases/v6.4.2/css/brands.css" async />
    <link rel="stylesheet" href="https://use.fontawesome.com/releases/v6.4.2/css/fontawesome.css" async />
  </>
);

export const DefaultColorsStyle = () => <Style css={colorsCss()} />;

// the texts of what the browser renders
export const TranslationsScript = ({ lang }: { lang: Lang }) => <Script code={`const i18n = ${scriptJson(dictionaries[lang])};`} />;

const FOOTER_PART = 'flex h-full items-center bg-white text-[.65rem]';

const FLAGS = 'public/images/flags/';
const flags = Object.keys(embedded)
  .filter(key => key.startsWith(FLAGS) && key.endsWith('.svg'))
  .map(key => key.slice(FLAGS.length))
  .sort();

export function Footer({ context }: { context: PageContext }) {
  const { tr } = context;
  const action = context.url.pathname + context.url.search;

  return (
    <footer class="mb-2 flex w-full flex-row-reverse items-center justify-between bg-[#dcdcdc] text-center">
      <div class={`${FOOTER_PART} mr-[5%] gap-[.4rem] self-end p-[.35rem] text-[#525252] [&_a]:h-3 [&_img]:h-3`}>
        <span>
          {APP_NAME} 2018-{new Date().getFullYear()}
        </span>
        <span class="text-black">{APP_VERSION} Beta</span>
        <a href="https://www.linkedin.com/in/guillaumevara/" title={tr('devLinkedin')} target="_blank" rel="noopener">
          <img src="/public/images/linkedin.png" alt={tr('devLinkedin')} />
        </a>
      </div>
      <div class="flex h-full items-center gap-[.75em] bg-transparent p-[.35rem] text-[.6em]">
        <a href="/account">
          <i class="fas fa-user-circle mr-[.25em]"></i>
          {tr('my_account')}
        </a>
        <a href="/api/docs" title={tr('api_docs')}>
          <i class="fas fa-code mr-[.25em]"></i>API
        </a>
      </div>
      <div id="langs" class={`${FOOTER_PART} languages ml-[5%] self-start px-[.35rem] py-0`}>
        {flags.map(file => {
          const flagLang = basename(file, '.svg');
          const isCurrent = flagLang === context.lang;
          return (
            <form method="post" action={action}>
              <label
                title={isCurrent ? undefined : tr('switch_lang', tr(`lang_${flagLang}` as TranslationKey))}
                class={isCurrent ? '' : 'clickable unselected'}
              >
                <input type="hidden" name="set_lang" value={flagLang} />
                <button type="submit" disabled={isCurrent} class="flex items-center [all:unset]">
                  <img src={`/public/images/flags/${file}`} alt={tr(`lang_${flagLang}` as TranslationKey)} />
                </button>
              </label>
            </form>
          );
        })}
      </div>
    </footer>
  );
}

// a page of the admin layout
export function AdminPage({ context, title, children }: { context: PageContext; title: string; children?: Child }) {
  return (
    <html lang={context.lang}>
      <head>
        <Metadata context={context} title={title} />
        <ExternalStyles />
        <DefaultColorsStyle />
        <ClientStyles />
      </head>
      <body>
        <div class="z-0 mx-4 flex grow flex-col justify-center">{children}</div>
        <Footer context={context} />
      </body>
    </html>
  );
}
