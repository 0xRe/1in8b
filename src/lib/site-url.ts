import type { Locale } from "./i18n";
import { SITE } from "./site-identity";

export const localePath = (locale: Locale) => locale === "en" ? "/" : `/${locale}/`;
export const duoPath = (locale: Locale) => `${localePath(locale)}together/`;
export const localeUrl = (locale: Locale) => `${SITE}${localePath(locale)}`;

/** Canonical host and legacy English URLs; retains the original path/query. */
export function canonicalRedirectUrl(input: string | URL, canonicalOrigin = SITE): URL | null {
  const url = new URL(input);
  const canonical = new URL(canonicalOrigin);
  const alias = canonical.hostname.startsWith("www.") ? canonical.hostname.slice(4) : `www.${canonical.hostname}`;
  const productionHost = url.hostname === canonical.hostname || url.hostname === alias;
  const canonicalHost = productionHost && url.origin !== canonical.origin;
  const legacyEnglish = url.pathname === "/en" || url.pathname === "/en/";
  if (!canonicalHost && !legacyEnglish) return null;
  if (productionHost) {
    url.protocol = canonical.protocol;
    url.host = canonical.host;
    url.port = canonical.port;
  }
  if (legacyEnglish) url.pathname = "/";
  return url;
}
