import {useMemo, useState} from 'react';
import type {Life} from '../game/types';import type {Locale,translator} from '../lib/i18n';import {chartSeries} from '../lib/chart-series';
type T=ReturnType<typeof translator>;
function YearChart({life,t,kind}:{life:Life;t:T;locale:Locale;kind:'income'|'wealth'}){
 const [index,setIndex]=useState(life.history.length-1);
 const {values,series}=useMemo(()=>{
  const vals=life.history.map(h=>kind==='income'?h.annual?.income??null:h.netAssets);
  return {values:vals,series:chartSeries(vals)};
 },[life.history,kind]);
 const at=Math.min(index,values.length-1),row=life.history[at],value=values[at],title=kind==='income'?t('feature.incomeChart'):t('feature.wealthChart');
 const money=t.money;
 return <section className="year-chart"><h3>{title}</h3><p className="muted">{t('feature.ppp')} {kind==='income'?t('feature.incomeGaps'):t('feature.wealthDebt')}</p>
 <div tabIndex={0} role="group" aria-label={t('feature.chartKeys',{title})} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();setIndex(i=>e.key==='Home'?0:e.key==='End'?values.length-1:Math.max(0,Math.min(values.length-1,i+(e.key==='ArrowRight'?1:-1))));}}}>
 <svg viewBox="0 0 550 215" role="img" aria-label={title} onPointerDown={e=>{const box=e.currentTarget.getBoundingClientRect(),point=(e.clientX-box.left)*550/box.width;setIndex(Math.max(0,Math.min(values.length-1,Math.round((point-65)/455*(values.length-1)))));}}>
 {[series.min,(series.min+series.max)/2,series.max].map((v,i)=><g key={i}><path d={`M65 ${series.y(v)}H520`} stroke="currentColor" opacity=".15"/><text x="58" y={series.y(v)+4} textAnchor="end">{money(v)}</text></g>)}
 {series.min<0&&series.max>0&&<path d={`M65 ${series.y(0)}H520`} stroke="currentColor" strokeDasharray="4 4" opacity=".5"/>}
 <path d={series.path} fill="none" stroke={kind==='income'?'#6e9487':'#b77965'} strokeWidth="2.5"/>
 {row&&<><path d={`M${series.x(at)} 30V180`} stroke="currentColor" opacity=".4" strokeDasharray="3 4"/>{value!==null&&<circle cx={series.x(at)} cy={series.y(value)} r="4" fill="#b77965"/>}</>}
 <text x="65" y="204">{t('age')} {life.history[0]?.age??0}</text><text x="290" y="204" textAnchor="middle">{life.history[Math.floor((values.length-1)/2)]?.age??0}</text><text x="520" y="204" textAnchor="end">{life.history.at(-1)?.age??0}</text>
 </svg></div>
 <p className="year-chart-readout" aria-live="polite">{row?t('feature.chartReadout',{age:row.age,year:life.birthYear+row.age,value:value===null?t('record.unknown'):money(value)}):t('feature.noYears')}{row?.annual&&` · ${t(`job.${row.annual.job}`)} · ${t(`allocation.${row.annual.allocation}`)}`}</p>
 </section>;
}
export function LifeTimeline({life,t,locale="en"}:{life:Life;t:T;locale?:Locale}){return <section className="life-timeline"><h2>{t("feature.financialYears")}</h2><p className="muted">{t("feature.chartHelp")}</p><YearChart life={life} t={t} locale={locale} kind="income"/><YearChart life={life} t={t} locale={locale} kind="wealth"/></section>;}
