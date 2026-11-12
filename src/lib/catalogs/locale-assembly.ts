import type { Locale } from '../i18n';
import { QUALIFICATION_CATALOGS } from './qualification';
import { EXPANDED_PARITY_CATALOGS } from './expanded-parity';
import { COMPETITOR_PARITY_CATALOGS } from './competitor-parity';
/** One locale's full catalog: its own messages plus the shared multi-locale additions. */
export function assembleLocale(locale: Locale, base: Record<string, string>): Record<string, string> {
  return {
    ...base,
    ...QUALIFICATION_CATALOGS[locale],
    ...EXPANDED_PARITY_CATALOGS[locale],
    ...COMPETITOR_PARITY_CATALOGS[locale],
  };
}
