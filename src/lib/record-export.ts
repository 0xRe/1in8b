import {qualificationLabel} from './qualification-label';
import type { AnnualRecord, Life } from '../game/types';
import {getCountries,countryName} from '../game/countries';
import type {Locale,translator} from './i18n';
type T=ReturnType<typeof translator>;
export function recordFocusLabel(record: AnnualRecord, t: T): string {
 if (record.completed === false) return '—';
 if (record.focusWeights) return Object.entries(record.focusWeights).filter(([,weight])=>weight>0).map(([focus,weight])=>`${t(`focus.${focus}`)} ${Math.round(weight*1000)/10}%`).join(' / ');
 return t(`focus.${record.focus}`);
}
export function recordRows(life:Life,t:T,locale:Locale='en'):(string|number)[][] {
 const number=(n:number)=>Math.round(n*100)/100,countries=getCountries();
 const country=(id:string)=>{const c=countries.find(c=>c.id===id);return c?countryName(c,locale):id;};
 const rows:(string|number)[][] = [
 ['age','year','health','happiness','knowledge','social','netWorth','record.country','ui.lastJob','education','record.focus','record.income','record.costs','record.surplus','record.cash','record.investments','record.debts','record.childrenAlive','children','record.family','family.grandchildrenAlive','family.grandchildren','family.greatGrandchildrenAlive','family.greatGrandchildren','family.greatGreatGrandchildrenAlive','family.greatGreatGrandchildren'].map(k=>t(k)),
 ...life.history.map(h=>[h.age,life.birthYear+h.age,...[h.health,h.happiness,h.knowledge,h.social,h.netAssets].map(number),...(h.annual?[country(h.annual.country),t(`job.${h.annual.job}`),qualificationLabel(h.annual.education,h.annual.academic,t),recordFocusLabel(h.annual,t),...[h.annual.income,h.annual.totalExpenses,h.annual.annualSavings,h.annual.savings,h.annual.investments,h.annual.debt,h.annual.childrenAlive,h.annual.children,h.annual.relativesAlive].map(number),h.annual.grandchildrenAlive===null?'':number(h.annual.grandchildrenAlive),h.annual.grandchildren===null?'':number(h.annual.grandchildren),...[h.annual.greatGrandchildrenAlive,h.annual.greatGrandchildren,h.annual.greatGreatGrandchildrenAlive,h.annual.greatGreatGrandchildren].map(n=>n==null?'':number(n))]:Array(19).fill(''))])];
 const monetaryColumns = [6,11,12,13,14,15,16];
 for (const i of monetaryColumns) {
   if (locale === 'en' && t.moneyLabel) rows[0][i] += ` (${t.moneyLabel})`;
   for (const row of rows.slice(1)) if (typeof row[i] === 'number') row[i] = number(t.displayAmount ? t.displayAmount(row[i] as number) : row[i] as number);
 }
 return rows;
}
export function recordCsv(life:Life,t:T,locale:Locale='en') {
 const cell=(v:string|number)=>{const s=typeof v==='string'&&/^[\s]*[=+@-]/.test(v)?`'${v}`:String(v);return `"${s.replaceAll('"','""')}"`;};
 return '\ufeff'+recordRows(life,t,locale).map(row=>row.map(cell).join(',')).join('\r\n');
}
export const escapeRecord=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function recordTable(life:Life,t:T,locale:Locale) {
 const [head,...rows]=recordRows(life,t,locale);
 return `<table><thead><tr>${head.map(h=>`<th>${escapeRecord(String(h))}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(v=>`<td>${escapeRecord(String(v))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
