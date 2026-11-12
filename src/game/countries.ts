import rawCountries from '../data/countries.json';
import type { Country, WeightMode } from './types';

const countries: Country[] = rawCountries as Country[];
const countryCodes: Record<string, string> = {"AFG":"AF","DZA":"DZ","AGO":"AO","ARG":"AR","AUS":"AU","AUT":"AT","AZE":"AZ","BGD":"BD","BLR":"BY","BEL":"BE","BEN":"BJ","BOL":"BO","BWA":"BW","BRA":"BR","BGR":"BG","BFA":"BF","BDI":"BI","KHM":"KH","CMR":"CM","CAN":"CA","CAF":"CF","TCD":"TD","CHL":"CL","CHN":"CN","COL":"CO","CRI":"CR","CIV":"CI","CUB":"CU","CZE":"CZ","DNK":"DK","DOM":"DO","ECU":"EC","EGY":"EG","SLV":"SV","GNQ":"GQ","ERI":"ER","ETH":"ET","FIN":"FI","FRA":"FR","GAB":"GA","GMB":"GM","GEO":"GE","DEU":"DE","GHA":"GH","GRC":"GR","GTM":"GT","GIN":"GN","GNB":"GW","HTI":"HT","HND":"HN","HUN":"HU","IND":"IN","IDN":"ID","IRN":"IR","IRQ":"IQ","IRL":"IE","ISR":"IL","ITA":"IT","JAM":"JM","JPN":"JP","JOR":"JO","KAZ":"KZ","KEN":"KE","KWT":"KW","KGZ":"KG","LAO":"LA","LBN":"LB","LSO":"LS","LBR":"LR","LBY":"LY","MDG":"MG","MWI":"MW","MYS":"MY","MLI":"ML","MRT":"MR","MEX":"MX","MNG":"MN","MAR":"MA","MOZ":"MZ","NAM":"NA","NPL":"NP","NLD":"NL","NZL":"NZ","NIC":"NI","NER":"NE","NGA":"NG","PRK":"KP","NOR":"NO","OMN":"OM","PAK":"PK","PAN":"PA","PNG":"PG","PRY":"PY","PER":"PE","PHL":"PH","POL":"PL","PRT":"PT","QAT":"QA","ROU":"RO","RUS":"RU","RWA":"RW","SAU":"SA","SEN":"SN","SRB":"RS","SLE":"SL","SGP":"SG","SVK":"SK","SOM":"SO","ZAF":"ZA","KOR":"KR","SSD":"SS","ESP":"ES","LKA":"LK","SDN":"SD","SWE":"SE","CHE":"CH","SYR":"SY","TWN":"TW","TJK":"TJ","TZA":"TZ","THA":"TH","TGO":"TG","TUN":"TN","TKM":"TM","UGA":"UG","UKR":"UA","ARE":"AE","GBR":"GB","USA":"US","URY":"UY","UZB":"UZ","VEN":"VE","VNM":"VN","YEM":"YE","ZMB":"ZM","ZWE":"ZW","HRV":"HR","MDA":"MD","ARM":"AM","LTU":"LT","SVN":"SI","LVA":"LV","MKD":"MK","XKX":"XK","BHR":"BH","TLS":"TL","EST":"EE","CYP":"CY","MUS":"MU","DJI":"DJ","FJI":"FJ","COM":"KM","GUY":"GY","SLB":"SB","BTN":"BT","LUX":"LU","MNE":"ME","SUR":"SR","MLT":"MT","MDV":"MV","CPV":"CV","COG":"CG","COD":"CD","MMR":"MM","PSE":"PS","TUR":"TR","HKG":"HK","BIH":"BA","ALB":"AL","TTO":"TT","SWZ":"SZ","MAC":"MO"};

const countryMap = new Map<string, Country>(countries.map(c => [c.id, c]));
const countryByLower = new Map<string, Country>();
for (const c of countries) {
  countryByLower.set(c.id.toLowerCase(), c);
  countryByLower.set(c.name_en.toLowerCase(), c);
}

/** Returns a country by its ISO code in constant time without array traversal. */
export function getCountryById(id: string): Country | undefined {
  return countryMap.get(id);
}

/** Looks up a country by ISO code or English name in constant time. */
export function findCountry(query: string): Country | undefined {
  return countryByLower.get(query.trim().toLowerCase());
}

/** Returns independent records so UI sorting cannot mutate the engine catalog. */
export function getCountries(): Country[] { return countries.map(c => ({ ...c, cs: c.cs ? [...c.cs] : null })); }

const displayNamesCache = new Map<string, Intl.DisplayNames>();
const countryNameCache = new Map<string, string>();

export function countryName(country: Country, locale: string): string {
  const cacheKey = `${country.id}:${locale}`;
  const cached = countryNameCache.get(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const tag = locale === 'zh' ? 'zh-Hant' : locale === 'zh-hans' ? 'zh-Hans' : locale;
    let dn = displayNamesCache.get(tag);
    if (!dn) {
      dn = new Intl.DisplayNames([tag], { type: 'region' });
      displayNamesCache.set(tag, dn);
    }
    const code = countryCodes[country.id];
    const name = (code && dn.of(code)) || country.name_en;
    countryNameCache.set(cacheKey, name);
    return name;
  } catch {
    countryNameCache.set(cacheKey, country.name_en);
    return country.name_en;
  }
}

/** Localize recognized public country identifiers without altering a frozen publication.
 * Unknown legacy display text remains verbatim rather than being guessed. */
export function publicCountryName(value:string,locale:string):string {
  const country = findCountry(value);
  return country ? countryName(country, locale) : value;
}

export function countryProbability(country: Country, mode: WeightMode): number {
  if (mode === 'equal') return 1 / countries.length;
  const field = mode === 'population' ? 'pop' : 'births';
  return country[field] / countries.reduce((sum, c) => sum + c[field], 0);
}

export const COUNTRY_TOTALS = { population: countries.reduce((s,c) => s + c.pop * 1000, 0), births: countries.reduce((s,c) => s + c.births, 0), countries: countries.length };
