import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { MONEY_REGIONS, moneyPlaceName, type MoneyRegion } from '../lib/money-display';
import type { Locale } from '../lib/i18n';
import './money-region-select.css';

const copy: Record<Locale, [string, string]> = {
 en:['Search country or currency…','No matching currencies.'], 'zh-hans':['搜索国家或货币…','没有匹配的货币。'], zh:['搜尋國家或貨幣…','沒有符合的貨幣。'], ja:['国・通貨を検索…','一致する通貨はありません。'], ko:['국가 또는 통화 검색…','일치하는 통화가 없습니다.'], vi:['Tìm quốc gia hoặc tiền tệ…','Không có tiền tệ phù hợp.'], fr:['Rechercher un pays ou une devise…','Aucune devise trouvée.'], th:['ค้นหาประเทศหรือสกุลเงิน…','ไม่พบสกุลเงินที่ตรงกัน'], es:['Buscar país o moneda…','No se encontraron monedas.'], de:['Land oder Währung suchen…','Keine passende Währung.'], tr:['Ülke veya para birimi ara…','Eşleşen para birimi yok.'], ru:['Поиск страны или валюты…','Валюты не найдены.'], pt:['Buscar país ou moeda…','Nenhuma moeda encontrada.'], id:['Cari negara atau mata uang…','Mata uang tidak ditemukan.'],
};
const normalize = (s: string) => s.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase();
export function moneyRegionOptions(locale: Locale, query = '') {
 const language = locale === 'zh-hans' ? 'zh-Hans' : locale === 'zh' ? 'zh-Hant' : locale;
 const names = new Intl.DisplayNames([language], {type:'currency'});
 const english = new Intl.DisplayNames(['en'], {type:'currency'});
 const englishPlaces = new Intl.DisplayNames(['en'], {type:'region'});
 const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
 return (Object.keys(MONEY_REGIONS) as MoneyRegion[]).map(code => {
  const region = MONEY_REGIONS[code], place = moneyPlaceName(code,locale), currency = names.of(region.currency) ?? region.currency;
  return {code, place, currency, symbol:region.prefix.trim(), currencyCode:region.currency, search:normalize(`${place} ${currency} ${region.label} ${englishPlaces.of(region.country)} ${english.of(region.currency)} ${region.country} ${region.currency} ${region.prefix}`)};
 }).filter(option => terms.every(term => option.search.includes(term))).sort((a,b)=>a.place.localeCompare(b.place,language));
}

/** Searchable local preference. Focus stays in the search field while arrows move the active option. */
export function MoneyRegionSelect({value,onChange,locale='en',label='Amounts in',id,disabled=false}:{value:MoneyRegion;onChange:(value:MoneyRegion)=>void;locale?:Locale;label?:string;id?:string;disabled?:boolean}) {
 const generated = useId(), triggerId = id ?? `money-${generated}`, listId = `${triggerId}-options`;
 const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), search = useRef<HTMLInputElement>(null), list = useRef<HTMLDivElement>(null);
 const [open,setOpen] = useState(false), [query,setQuery] = useState(''), [active,setActive] = useState<MoneyRegion>(value), [position,setPosition] = useState<CSSProperties>({});
 const options = useMemo(()=>moneyRegionOptions(locale,query),[locale,query]);
 const selected = useMemo(()=>moneyRegionOptions(locale).find(option=>option.code===value)!,[locale,value]);
 const activeCode = options.some(option=>option.code===active) ? active : options[0]?.code;
 const close = (restore = false) => {setOpen(false); if(restore)trigger.current?.focus({preventScroll:true});};
 const show = () => {if(disabled)return;setQuery('');setActive(value);setOpen(true);};
 const choose = (code:MoneyRegion) => {if(disabled)return;onChange(code);close(true);};
 useLayoutEffect(()=>{
  if(!open)return;
  const place = () => {
   const rect=trigger.current?.getBoundingClientRect();if(!rect)return;
   const viewport=window.visualViewport, leftEdge=viewport?.offsetLeft??0, topEdge=viewport?.offsetTop??0, width=viewport?.width??window.innerWidth, height=viewport?.height??window.innerHeight;
   const panelWidth=Math.min(Math.max(rect.width,330),width-16), below=topEdge+height-rect.bottom-8, above=rect.top-topEdge-8, upward=below<250&&above>below, available=Math.max(90,upward?above:below);
   setPosition({position:'fixed',width:panelWidth,left:Math.max(leftEdge+8,Math.min(rect.left,leftEdge+width-panelWidth-8)),maxHeight:Math.min(350,available),...(upward?{bottom:window.innerHeight-rect.top+5}:{top:rect.bottom+5})});
  };
  place();search.current?.focus({preventScroll:true});
  window.addEventListener('resize',place);window.addEventListener('scroll',place,true);window.visualViewport?.addEventListener('resize',place);
  return()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);window.visualViewport?.removeEventListener('resize',place);};
 },[open]);
 useEffect(()=>{
  if(!open)return;
  const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))close();};
  document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);
 },[open]);
 useEffect(()=>{if(disabled)setOpen(false);},[disabled]);
 useEffect(()=>{
  if(!open)return;
  const container=list.current, option=container?.querySelector<HTMLElement>(`[data-code="${activeCode}"]`);
  if(!container||!option)return;
  // scrollIntoView also scrolls the page/modal ancestors and can move the trigger offscreen.
  // Move only this bounded list, leaving the page and the popup's viewport anchor untouched.
  const bounds=container.getBoundingClientRect(), item=option.getBoundingClientRect();
  if(item.top<bounds.top)container.scrollTop+=item.top-bounds.top;
  else if(item.bottom>bounds.bottom)container.scrollTop+=item.bottom-bounds.bottom;
 },[open,activeCode,position.maxHeight]);
 function keydown(event:KeyboardEvent<HTMLInputElement>) {
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);return;}
  if(event.key==='Tab'){close(true);return;}
  if(event.key==='Enter'){event.preventDefault();if(activeCode)choose(activeCode);return;}
  if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
   event.preventDefault();const index=options.findIndex(option=>option.code===activeCode), next=event.key==='Home'?0:event.key==='End'?options.length-1:(index+(event.key==='ArrowDown'?1:-1)+options.length)%options.length;
   if(options[next])setActive(options[next].code);
  }
 }
 return <div className="money-select" ref={root} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))close();}}>
  <button type="button" id={triggerId} ref={trigger} className="money-select-trigger" role="combobox" aria-label={`${label}: ${selected.place} · ${selected.currencyCode} ${selected.symbol}`} aria-expanded={open} aria-controls={open?listId:undefined} aria-haspopup="listbox" disabled={disabled} onClick={()=>open?close():show()} onKeyDown={event=>{if(['ArrowDown','ArrowUp','Enter',' '].includes(event.key)){event.preventDefault();if(open&&(event.key==='Enter'||event.key===' '))close();else show();}}}>
   <span className="money-select-value"><span>{selected.place}</span><small>{selected.currencyCode} {selected.symbol}</small></span><ChevronsUpDown size={16} aria-hidden="true"/>
  </button>
  {open&&<div className="money-select-panel" style={position}>
   <div className="money-select-search"><Search size={16} aria-hidden="true"/><input ref={search} type="search" role="combobox" aria-label={copy[locale][0]} placeholder={copy[locale][0]} value={query} autoComplete="off" spellCheck={false} aria-autocomplete="list" aria-expanded="true" aria-controls={listId} aria-activedescendant={activeCode?`${listId}-${activeCode}`:undefined} onKeyDown={keydown} onChange={event=>{setQuery(event.target.value);setActive(value);}}/></div>
   <div id={listId} ref={list} role="listbox" aria-label={label} className="money-select-options">
    {options.map(option=><div role="option" id={`${listId}-${option.code}`} key={option.code} data-code={option.code} aria-selected={value===option.code} className={`money-select-option${activeCode===option.code?' is-active':''}`} onPointerMove={()=>setActive(option.code)} onMouseDown={event=>event.preventDefault()} onClick={()=>choose(option.code)}><Check size={16} className={value===option.code?'':'money-select-unchecked'} aria-hidden="true"/><span><strong>{option.place}</strong><small>{option.currency}</small></span><span className="money-select-code">{option.currencyCode}<small>{option.symbol}</small></span></div>)}
   </div>
   {!options.length&&<p className="money-select-empty" role="status">{copy[locale][1]}</p>}
  </div>}
 </div>;
}
