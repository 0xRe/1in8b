import type { Locale } from '../i18n';
import { assembleLocale } from './locale-assembly';
import ko from './ko';
import ja from './ja';
import zh from './zh';
import zhHans from './zh-hans';
import vi from './vi';
import fr from './fr';
import th from './th';
import es from './es';
import de from './de';
import tr from './tr.json';
import ru from './ru.json';
import pt from './pt.json';
import id from './id.json';

/** Server and tests: every locale, synchronously. The browser build uses `locales.client.ts`. */
const BASES: Record<Exclude<Locale, 'en'>, Record<string, string>> = { ko, ja, zh, 'zh-hans': zhHans, vi, fr, th, es, de, tr, ru, pt, id };
export const LOCALE_CATALOGS: Partial<Record<Locale, Record<string, string>>> = Object.fromEntries(
  Object.entries(BASES).map(([locale, base]) => [locale, assembleLocale(locale as Locale, base)]),
);
export const loadLocaleCatalog = (_locale: Locale): Promise<void> => Promise.resolve();
