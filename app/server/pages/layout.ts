// Parts shared by the pages : metadata, footer, the scripts and styles inlined into them, form helpers

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { APP_NAME, APP_ROOT, APP_VERSION, DEFAULT_BACKGROUND_COLORS, ENFORCE_CANONICAL_HTTP_SCHEME } from '../config';
import type { Html } from '../html';
import { html, raw } from '../html';
import type { Lang, TranslationKey, Translator } from '../i18n';
import { dictionaries } from '../i18n';
import type { Session } from '../session';

// what a page is rendered from
export interface PageContext {
  request: Request;
  url: URL;
  session: Session;
  clientIp: string;
  lang: Lang;
  tr: Translator;
  // called by the scripts of the pages, which then only want the content of the page (X-Requested-With)
  isXhr: boolean;
  // posted fields, to fill the form back
  form: Record<string, string>;
}

//
// Files inlined into the pages
//

const cache = new Map<string, string>();
const caching = process.env.NODE_ENV === 'production';

// the files of Vite's entry, relative to client/dist/
export interface ClientEntry {
  file: string;
  css?: string[];
}

// the entries of Vite's build (vite.config.ts) : the library page's, and the account page's when it stands alone
export const LIBRARY_ENTRY = 'main.tsx';
export const ACCOUNT_ENTRY = 'account/main.ts';

export function clientEntryIn(manifest: string, name = LIBRARY_ENTRY): ClientEntry | undefined {
  return (JSON.parse(manifest) as Record<string, ClientEntry>)[name];
}

const cachedClientEntries = new Map<string, ClientEntry>();

function clientEntry(name = LIBRARY_ENTRY): ClientEntry | undefined {
  const cachedEntry = cachedClientEntries.get(name);
  if (cachedEntry) return cachedEntry;

  let entry: ClientEntry | undefined;
  try {
    entry = clientEntryIn(readFileSync(join(APP_ROOT, 'client/dist/.vite/manifest.json'), 'utf8'), name);
  } catch {}
  if (!entry) console.error('No browser build in client/dist : run "bun run build"');
  if (caching && entry) cachedClientEntries.set(name, entry);
  return entry;
}

// the script of Vite's build : without it, the page misses what moved there
export function clientScript(name = LIBRARY_ENTRY): Html {
  const entry = clientEntry(name);
  return entry ? html`<script type="module" src="/web/${entry.file}"></script>` : html``;
}

// after the styles of client/legacy/ : they share the same weight at times, where the last one wins
export function clientStyles(): Html {
  return html`${(clientEntry()?.css ?? []).map(file => html`<link rel="stylesheet" href="/web/${file}">`)}`;
}

// the files of an application folder, concatenated in alphabetical order (not recursive)
export function filesOf(folder: string): string {
  const cached = cache.get(folder);
  if (cached !== undefined) return cached;

  const path = join(APP_ROOT, folder);
  const content = `${readdirSync(path)
    .sort()
    .map(name => join(path, name))
    .filter(file => statSync(file).isFile())
    .map(file => readFileSync(file, 'utf8'))
    .join('')}\n`;

  if (caching) cache.set(folder, content);
  return content;
}

//
// Shards
//

// animated band of the colors of "owner" (see colorsCss())
export const wAnim = (owner: string) => html`<div class="wAnim" data-owner="${owner}"></div>`;

// the animated band colors : of "owner", else the default ones
export function colorsCss(owner?: string, colors?: string[]): string {
  const target = owner && colors ? `[data-owner="${owner}"]` : '';
  const [a, b, c, d] = owner && colors ? colors : DEFAULT_BACKGROUND_COLORS;
  return `.wAnim${target}::after { background: linear-gradient(-45deg, ${a}, ${b}, ${c}, ${d});}`;
}

export interface FormResult {
  isError: boolean;
  description: string | null;
}

export function popup(result: FormResult | null): Html {
  if (!result?.description) return html``;
  return html`<div onclick="this.classList.toggle('hide')" class="popup ${result.isError ? 'error' : 'info'}"><div class="content">${result.description}</div></div>`;
}

export interface LengthRule {
  min: number;
  max: number;
}

interface InputParams {
  name?: string;
  type?: string;
  placeholder?: TranslationKey;
  required?: boolean;
  autocomplete?: string;
}

// input of the forms, filled back with what was posted
export function magnifikInput(context: PageContext, params: InputParams, rules?: Record<string, LengthRule>): Html {
  const type = params.type ?? 'text';
  const name = type === 'password' || type === 'email' ? type : (params.name ?? '');
  const rule = rules?.[name];
  const value = context.form[name];

  return html`<div class='magnifik' ${params.placeholder ? html`placeholder="${context.tr(params.placeholder)}"` : ''}>
                <input ${params.required ? 'required' : ''} ${value ? html`value="${value}"` : ''} ${
                  rule ? html`pattern=".{${rule.min},${rule.max}}" placeholder="${context.tr('e_log_rule', rule.min, rule.max)}"` : ''
                } type="${type}" name="${name}" ${params.autocomplete ? html`autocomplete="${params.autocomplete}"` : ''} />
            </div>`;
}

//
// Head and footer
//

function canonicalHost(request: Request): string {
  const headers = request.headers;
  const scheme = headers.get('x-forwarded-proto') || (ENFORCE_CANONICAL_HTTP_SCHEME ? 'http' : 'https');
  const host = headers.get('x-forwarded-host') || headers.get('host') || new URL(request.url).host;
  return `${scheme}://${host}`;
}

export function metadata(context: PageContext, title: string): Html {
  const description = context.tr('app_descr');
  const host = canonicalHost(context.request);
  const image = `${host}/public/images/og_image.png`;
  const url = host + context.url.pathname + context.url.search;

  return html`<meta charset="UTF-8">
<title>${title}</title>
<link rel="icon" type="image/png" href="/public/favicon/favicon-96x96.png" sizes="96x96" />
<link rel="shortcut icon" href="/public/favicon/favicon.ico" />
<link rel="apple-touch-icon" sizes="180x180" href="/public/favicon/apple-touch-icon.png" />
<link rel="manifest" href="/public/favicon/site.webmanifest" />
<meta name="description" content="${description}">
<meta name="theme-color" content="#efefef">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${image}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="256">
<meta property="og:image:height" content="256">
<meta property="og:type" content="website">
<meta name="twitter:image" content="${image}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:title" content="${title}">
<meta name="twitter:card" content="photo">`;
}

// "SoundVitrine - <subtitle>"
export const pageTitle = (subtitle?: string) => (subtitle ? `${APP_NAME} - ${subtitle}` : APP_NAME);

export const externalStyles = html`<link rel="stylesheet" href="https://use.fontawesome.com/releases/v6.4.2/css/solid.css" async>
<link rel="stylesheet" href="https://use.fontawesome.com/releases/v6.4.2/css/brands.css" async>
<link rel="stylesheet" href="https://use.fontawesome.com/releases/v6.4.2/css/fontawesome.css" async>
<link rel="stylesheet" href="/public/ext/css/animate.min.css">`;

export const adminStyles = () => html`<style>
${raw(filesOf('client/legacy/admin/css'))}${colorsCss()}
</style>`;

// JSON in a <script>, which must not close it
const scriptJson = (value: unknown) => raw(JSON.stringify(value).replace(/</g, '\\u003c'));

// the texts of the library page's panels
export const translationsScript = (context: PageContext) => html`<script>
    const i18n = ${scriptJson(dictionaries[context.lang])};
</script>`;

const flags = readdirSync(join(APP_ROOT, 'client/public/images/flags'))
  .filter(name => name.endsWith('.svg'))
  .sort();

export function footer(context: PageContext): Html {
  const action = context.url.pathname + context.url.search;

  return html`<footer style="text-align: center">
    <div id='credits' style="gap: .4rem">
        <span>${APP_NAME} 2018-${new Date().getFullYear()}</span>
        <span style="color:black">${APP_VERSION} Beta</span>
        <a href='https://www.linkedin.com/in/guillaumevara/' title="${context.tr('devLinkedin')}" target="_blank" rel="noopener">
            <img src='/public/images/linkedin.png' alt="${context.tr('devLinkedin')}"/>
        </a>
    </div>
    <div style="background-color: transparent; font-size: .6em">
        <a href="/account"><i class="fas fa-user-circle" style="margin-right: .25em;"></i>${context.tr('my_account')}</a>
    </div>
    <div id="langs">
        ${flags.map(file => {
          const flagLang = basename(file, '.svg');
          const isCurrent = flagLang === context.lang;
          const langName = `lang_${flagLang}` as TranslationKey;
          return html`<form method="POST" action="${action}">
            <label ${isCurrent ? '' : html`title="${context.tr('switch_lang', context.tr(langName))}"`} class="${isCurrent ? '' : 'clickable unselected'}">
                <input type="hidden" name="set_lang" value="${flagLang}" />
                <button ${isCurrent ? 'disabled' : ''} style="all:unset; display: flex; align-items: center">
                    <img src="/public/images/flags/${file}" />
                </button>
            </label>
        </form>`;
        })}
    </div>
</footer>`;
}

// a page of the admin layout : the content only, when the page scripts ask for it
export function adminPage(context: PageContext, title: string, content: Html): Html {
  if (context.isXhr) return content;

  return html`<!DOCTYPE html>
<html lang="${context.lang}">
    <head>
        ${metadata(context, title)}
        ${externalStyles}
        ${adminStyles()}
    </head>
    <body>
        <div id="mainFrame" style="margin: 0 1rem;">
            ${content}
        </div>
        ${footer(context)}
    </body>
</html>`;
}
