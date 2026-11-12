import type {Life} from '../game/types';
import {countryName} from '../game/countries';
import type {Locale,translator} from './i18n';
import {collectionCopy} from './share-collection-copy';
import {viralCopy,lifePost} from './viral-copy';
import {lifeGrain} from './life-insights';

export type CollectionKind='journey'|'comparison';
export const MAX_COMPARISON_LIVES=4;

/** Only completed, non-classroom lives on this device are offered for public comparison. */
export function comparisonCandidates(current:Life,past:readonly Life[]):Life[]{
 const seen=new Set<string>();
 return [current,...past].filter(life=>{
  if(life.alive||life.settings.classroom||seen.has(life.id))return false;
  seen.add(life.id);return true;
 });
}
export function selectedComparison(candidates:readonly Life[],ids:readonly string[]):Life[]{
 const byId=new Map(candidates.filter(l=>!l.alive&&!l.settings.classroom).map(l=>[l.id,l]));
 return [...new Set(ids)].flatMap(id=>byId.has(id)?[byId.get(id)!]:[]).slice(0,MAX_COMPARISON_LIVES);
}
/** Facts known at birth. Later income, religion, residence and family state are deliberately absent. */
export function beginningFacts(life:Life){
 return {name:life.name,seed:life.seed,sex:life.sex,birthYear:life.birthYear,country:life.migration?.birthCountry??life.country};
}
export function journeyEndingWords(life:Life,t:ReturnType<typeof translator>,comment=''){
 return [t(lifeGrain(life).nameKey),`${t('children')}: ${life.family.children.length} · ${t('family.grandchildren')}: ${life.descendants.grandchildren.length}`,comment.trim().slice(0,160)].filter(Boolean).join('\n');
}
export function collectionCaption(kind:CollectionKind,lives:readonly Life[],locale:Locale,t:ReturnType<typeof translator>,comment=''){
 const copy=collectionCopy(locale),words=comment.trim().slice(0,160);
 if(kind==='journey'){
  const l=lives[0];if(!l||l.alive||l.settings.classroom)return '';
  return [words,`${t('bornIn',{country:countryName(beginningFacts(l).country,locale)})} · ${l.birthYear}`,lifePost(l,locale,t)].filter(Boolean).join('\n');
 }
 if(lives.length<2||lives.length>MAX_COMPARISON_LIVES||new Set(lives.map(l=>l.id)).size!==lives.length||lives.some(l=>l.alive||l.settings.classroom))return '';
 return [words,copy.comparisonTitle,...lives.map((l,i)=>`${i+1}. ${l.name} · ${countryName(beginningFacts(l).country,locale)} · ${t('years',{n:l.age})} · ${t(lifeGrain(l).nameKey)}`),viralCopy(locale).postChallenge].filter(Boolean).join('\n');
}
