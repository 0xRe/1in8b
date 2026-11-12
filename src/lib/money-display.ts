/** Presentation-only purchasing-power constants observed in the reference game.
 * These are not live FX rates. Economic/save values always stay in base PPP units.
 */
export const MONEY_REGIONS = {
  USD: { label: 'US', adjective: 'US', factor: 1, prefix: '$', currency: 'USD', country: 'US' },
  GBP: { label: 'UK', adjective: 'UK', factor: .68, prefix: '£', currency: 'GBP', country: 'GB' },
  EUR: { label: 'Ireland', adjective: 'Irish', factor: .75, prefix: '€', currency: 'EUR', country: 'IE' },
  CAD: { label: 'Canada', adjective: 'Canadian', factor: 1.17, prefix: 'C$', currency: 'CAD', country: 'CA' },
  AUD: { label: 'Australia', adjective: 'Australian', factor: 1.4, prefix: 'A$', currency: 'AUD', country: 'AU' },
  NZD: { label: 'New Zealand', adjective: 'New Zealand', factor: 1.47, prefix: 'NZ$', currency: 'NZD', country: 'NZ' },
  INR: { label: 'India', adjective: 'Indian', factor: 20.1, prefix: '₹', currency: 'INR', country: 'IN' },
  PKR: { label: 'Pakistan', adjective: 'Pakistani', factor: 67.8, prefix: 'Rs\u00a0', currency: 'PKR', country: 'PK' },
  PHP: { label: 'Philippines', adjective: 'Philippine', factor: 19.1, prefix: '₱', currency: 'PHP', country: 'PH' },
  SGD: { label: 'Singapore', adjective: 'Singapore', factor: .79, prefix: 'S$', currency: 'SGD', country: 'SG' },
  MYR: { label: 'Malaysia', adjective: 'Malaysian', factor: 1.36, prefix: 'RM', currency: 'MYR', country: 'MY' },
  NGN: { label: 'Nigeria', adjective: 'Nigerian', factor: 195, prefix: '₦', currency: 'NGN', country: 'NG' },
  GHS: { label: 'Ghana', adjective: 'Ghanaian', factor: 4.75, prefix: 'GH₵', currency: 'GHS', country: 'GH' },
  KES: { label: 'Kenya', adjective: 'Kenyan', factor: 43.5, prefix: 'KSh\u00a0', currency: 'KES', country: 'KE' },
  ZAR: { label: 'South Africa', adjective: 'South African', factor: 7.42, prefix: 'R', currency: 'ZAR', country: 'ZA' },
  // Added 2026-10-28 so players outside the original's 15 places see their own prices: World Bank
  // PPP conversion factor, GDP (LCU per international $), 2024 (PA.NUS.PPP); Taiwan from IMF, ≈13.5.
  EUR_DE: { label: 'Germany', adjective: 'German', factor: .7, prefix: '€', currency: 'EUR', country: 'DE' },
  EUR_FR: { label: 'France', adjective: 'French', factor: .68, prefix: '€', currency: 'EUR', country: 'FR' },
  EUR_ES: { label: 'Spain', adjective: 'Spanish', factor: .56, prefix: '€', currency: 'EUR', country: 'ES' },
  JPY: { label: 'Japan', adjective: 'Japanese', factor: 94.5, prefix: '¥', currency: 'JPY', country: 'JP' },
  KRW: { label: 'South Korea', adjective: 'South Korean', factor: 809, prefix: '₩', currency: 'KRW', country: 'KR' },
  CNY: { label: 'China', adjective: 'Chinese', factor: 3.53, prefix: 'CN¥', currency: 'CNY', country: 'CN' },
  TWD: { label: 'Taiwan', adjective: 'Taiwanese', factor: 13.5, prefix: 'NT$', currency: 'TWD', country: 'TW' },
  VND: { label: 'Vietnam', adjective: 'Vietnamese', factor: 6955, prefix: '₫', currency: 'VND', country: 'VN' },
  THB: { label: 'Thailand', adjective: 'Thai', factor: 10.47, prefix: '฿', currency: 'THB', country: 'TH' },
  TRY: { label: 'Türkiye', adjective: 'Turkish', factor: 11.56, prefix: '₺', currency: 'TRY', country: 'TR' },
  RUB: { label: 'Russia', adjective: 'Russian', factor: 29, prefix: '₽', currency: 'RUB', country: 'RU' },
  BRL: { label: 'Brazil', adjective: 'Brazilian', factor: 2.48, prefix: 'R$', currency: 'BRL', country: 'BR' },
  IDR: { label: 'Indonesia', adjective: 'Indonesian', factor: 4741, prefix: 'Rp', currency: 'IDR', country: 'ID' },
  MXN: { label: 'Mexico', adjective: 'Mexican', factor: 9.92, prefix: 'MX$', currency: 'MXN', country: 'MX' },
} as const;
export type MoneyRegion = keyof typeof MONEY_REGIONS;
export const MONEY_PREFERENCE = '1in8bn-money-en';
export const isMoneyRegion = (value: unknown): value is MoneyRegion => typeof value === 'string' && Object.hasOwn(MONEY_REGIONS, value);
/** Page language chooses the initial presentation; only an explicit saved choice overrides it. */
const localeRegions: Record<string, MoneyRegion> = { en:'USD', de:'EUR_DE', fr:'EUR_FR', es:'EUR_ES', ja:'JPY', ko:'KRW', 'zh-hans':'CNY', zh:'TWD', vi:'VND', th:'THB', tr:'TRY', ru:'RUB', pt:'BRL', id:'IDR' };
export function defaultMoneyRegion(locale = 'en'): MoneyRegion {
  return localeRegions[locale.toLowerCase()] ?? 'USD';
}
/** Retained arguments keep existing callers compatible; device location never overrides the selected page language. */
export function chooseMoneyRegion(saved: unknown, _timezone = '', _languages: readonly string[] = [], locale = 'en'): MoneyRegion {
  return isMoneyRegion(saved) ? saved : defaultMoneyRegion(locale);
}
export function readMoneyRegion(storage: Pick<Storage,'getItem'> | null, timezone = '', languages: readonly string[] = [], locale = 'en'): MoneyRegion {
  let saved: string | null = null;
  try { saved = storage?.getItem(MONEY_PREFERENCE) ?? null; } catch { /* Optional preference. */ }
  return chooseMoneyRegion(saved, timezone, languages, locale);
}
export function moneyPresentation(locale: string, chosen: MoneyRegion = 'USD') {
  const code = isMoneyRegion(chosen) ? chosen : 'USD';
  const region = MONEY_REGIONS[code];
  const displayAmount = (base: number) => base * region.factor;
  const baseAmount = (display: number) => display / region.factor;
  const money = (base: number, compact = true) => {
    if (!Number.isFinite(base)) return '—';
    const value = displayAmount(base), n = Math.abs(value), sign = value < 0 ? '-' : '';
    // Other languages write the place's currency their own way; large sums compact as in English.
    if (locale !== 'en') return new Intl.NumberFormat(locale === 'zh-hans' ? 'zh-Hans' : locale === 'zh' ? 'zh-Hant' : locale, { style:'currency', currency:region.currency, ...(compact && n >= 1e6 ? { notation:'compact' as const, maximumSignificantDigits:3 } : { maximumFractionDigits:0 }) }).format(value);
    const number = !compact ? Math.round(n).toLocaleString('en-US') : n >= 1e9 ? `${(n / 1e9).toFixed(n >= 1e10 ? 0 : 1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e4 ? `${Math.round(n / 1e3).toLocaleString('en-US')}K` : Math.round(n).toLocaleString('en-US');
    return `${sign}${region.prefix}${number}`;
  };
  return { money, displayAmount, baseAmount, moneyRegion: code, moneyLabel: locale === 'en' ? `${region.prefix.trim()}, at ${region.adjective} prices` : region.currency };
}
/** The place's name in the reader's language, e.g. "Allemagne" for Germany in French. */
export function moneyPlaceName(code: MoneyRegion, locale: string): string {
  const region = MONEY_REGIONS[code];
  if (locale === 'en') return region.label;
  try { return new Intl.DisplayNames([locale === 'zh-hans' ? 'zh-Hans' : locale === 'zh' ? 'zh-Hant' : locale], { type: 'region' }).of(region.country) ?? region.label; } catch { return region.label; }
}
