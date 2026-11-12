import type {ReactNode} from 'react';
import type {Locale} from '../lib/i18n';
import {localePath} from '../lib/site-url';
/** One brand/control layout for both the landing page and birth registration. */
export function SiteHeader({locale,controls,onHome}:{locale:Locale;controls:ReactNode;onHome:()=>void}) {
 return <header className="home-top wrap site-header"><a className="identity-wordmark" href={localePath(locale)} onClick={event=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();onHome();}}><img src="/icon.svg?v=passport2" alt="" width="32" height="32"/><span>1in8bn</span><small>1in8bn.com</small></a><div className="site-header-controls">{controls}</div></header>;
}
