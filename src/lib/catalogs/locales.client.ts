import type { Locale } from '../i18n';

/**
 * Browser build of `locales.ts`: catalogs load on demand, so a visitor downloads English (bundled
 * with i18n) and their own language rather than all fourteen. The page's locale is loaded before
 * hydration (src/client.tsx) and before a locale route renders ($locale beforeLoad).
 */
type Base = { default: Record<string, string> };
const BASES: Record<Exclude<Locale, 'en'>, () => Promise<Base>> = {
  ko: () => import('./ko'), ja: () => import('./ja'), zh: () => import('./zh'), 'zh-hans': () => import('./zh-hans'),
  vi: () => import('./vi'), fr: () => import('./fr'), th: () => import('./th'), es: () => import('./es'), de: () => import('./de'),
  tr: () => import('./tr.json'), ru: () => import('./ru.json'), pt: () => import('./pt.json'), id: () => import('./id.json'),
};
export const LOCALE_CATALOGS: Partial<Record<Locale, Record<string, string>>> = {};
const pending = new Map<Locale, Promise<void>>();
export function loadLocaleCatalog(locale: Locale): Promise<void> {
  if (locale === 'en' || LOCALE_CATALOGS[locale]) return Promise.resolve();
  let load = pending.get(locale);
  if (!load) {
    load = Promise.all([BASES[locale](), import('./locale-assembly')])
      .then(([base, { assembleLocale }]) => { LOCALE_CATALOGS[locale] = assembleLocale(locale, base.default); })
      .catch((error) => { pending.delete(locale); throw error; });
    pending.set(locale, load);
  }
  return load;
}
