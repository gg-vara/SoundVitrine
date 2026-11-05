// Translations : the language comes from the session, else the browser (Accept-Language), else English

import { en } from './translations/en';
import { fr } from './translations/fr';

export type Lang = 'en' | 'fr';
export type TranslationKey = keyof typeof en;

export const dictionaries: Record<Lang, Record<TranslationKey, string>> = { en, fr };
export const defaultLang: Lang = 'en';

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && value in dictionaries;
}

// primary language of an Accept-Language header, if handled
export function langFromHeader(acceptLanguage: string | null): Lang | undefined {
  const primary = acceptLanguage?.split(',')[0]?.split(/[-_;]/)[0]?.trim().toLowerCase();
  return isLang(primary) ? primary : undefined;
}

// printf-like : %s and %d take the arguments in order, %% is a percent sign
export function format(template: string, ...args: (string | number)[]): string {
  let next = 0;
  return template.replace(/%([sd%])/g, (match, kind: string) => {
    if (kind === '%') return '%';
    if (next >= args.length) return match;
    const value = args[next++];
    return kind === 'd' ? String(Math.trunc(Number(value))) : String(value);
  });
}

export type Translator = (key: TranslationKey, ...args: (string | number)[]) => string;

export function translator(lang: Lang): Translator {
  return (key, ...args) => format(dictionaries[lang][key], ...args);
}
