import type {Life} from '../game/types';
import type {Locale,translator} from '../lib/i18n';
import {storyMoments} from '../lib/share-story';
import {storyCopy} from '../lib/share-story-copy';
export function ShareStoryPicker({life,locale,t,selected,onSelect}:{life:Life;locale:Locale;t:ReturnType<typeof translator>;selected:string;onSelect:(id:string)=>void}){
 const moments=storyMoments(life,selected),copy=storyCopy(locale);
 if(!moments.length)return null;
 return <fieldset className="share-story-picker"><legend>{copy.choose}</legend>
  <button type="button" className="share-story-overview" aria-pressed={!selected} onClick={()=>onSelect('')}>{copy.life}</button>
  <p className="share-story-label">{copy.moment}</p><p className="share-story-hint">{copy.hint}</p>
  <div className="share-moments">{moments.map(e=><button type="button" key={e.id} aria-pressed={selected===e.id} onClick={()=>onSelect(e.id)}><small>{t('age')} {e.age} · {e.year}</small><span>{t(e.key,e.params)}</span></button>)}</div>
 </fieldset>;
}
