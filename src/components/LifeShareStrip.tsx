import type {Life} from '../game/types';
import type {Locale,translator} from '../lib/i18n';
import {birthInvitationUrl} from '../lib/social-sharing';
import {lifeShareUrl} from '../lib/life-share';
import {shareText} from '../lib/life-media';
import {lifePost} from '../lib/viral-copy';
import {ShareDestinations} from './ShareDestinations';

/** Immediately available on the result itself, independent of the image editor dialog. */
export function LifeShareStrip({life,locale,t,onOpenCard}:{life:Life;locale:Locale;t:ReturnType<typeof translator>;onOpenCard?:()=>void}){
 if(life.settings.classroom)return null;
 const country=life.migration?.birthCountry??life.country;
 const url=lifeShareUrl(birthInvitationUrl(locale,country.id),life);
 const text=life.alive?shareText(life,locale,t):lifePost(life,locale,t);
 return <ShareDestinations variant="inline" title={life.name} text={text} url={url} locale={locale} onOpenCard={onOpenCard}/>;
}
