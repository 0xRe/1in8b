import type {Locale} from '../lib/i18n';
import {LOCALE_FLAGS} from '../lib/locale-flags';
export function LocaleFlag({locale}:{locale:Locale}) {
 // Some OS region settings omit this emoji; render the familiar flag locally.
 return <span className="locale-flag" aria-hidden="true">{locale==='zh'?<svg viewBox="0 0 30 20" width="22" height="16"><rect width="30" height="20" fill="#df2637"/><rect width="15" height="10" fill="#183b91"/><g transform="translate(7.5 5)" fill="white">{Array.from({length:12},(_,i)=><path key={i} transform={`rotate(${i*30})`} d="M0 -4 .65 -2.3 -.65 -2.3Z"/>)}<circle r="2.1"/></g></svg>:LOCALE_FLAGS[locale]}</span>;
}
