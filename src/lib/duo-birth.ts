import { countryName, countryProbability } from '../game/countries';
import type { DuoSnapshot } from './duo-engine';
import { DUO_PUBLIC_URL } from './duo-keepsake';
import { textLines } from './life-media';
/** Only the actor's birth facts enter the export. Peer origin stays in the room UI. */
export function duoBirthModel(snapshot:DuoSnapshot){
 const life=snapshot.lifetime!.self.life,country=life.migration.birthCountry;
 return {name:snapshot.self.name,country:countryName(country,'en'),year:life.birthYear,percent:countryProbability(country,'births')*100};
}
export function duoBirthPayload(model:ReturnType<typeof duoBirthModel>){return {title:'My beginning · 1in8bn',url:DUO_PUBLIC_URL,text:`My simulated life began in ${model.country} in ${model.year}. ${model.percent.toFixed(2)}% of the game’s birth-weighted draws begin here. Where would yours begin? Play free: ${DUO_PUBLIC_URL}`};}
export function drawDuoBirthCard(canvas:HTMLCanvasElement,model:ReturnType<typeof duoBirthModel>){
 const c=canvas.getContext('2d');if(!c)throw Error('Canvas unavailable');const w=canvas.width,h=canvas.height;
 c.fillStyle='#fffdf7';c.fillRect(0,0,w,h);c.fillStyle='#315f50';c.fillRect(0,0,w,h*.08);c.fillStyle='#ffffff';c.font=`600 ${w*.035}px sans-serif`;c.fillText('1 in 8 Billion · My beginning',w*.07,h*.05);
 c.fillStyle='#203c43';c.font=`${w*.04}px sans-serif`;c.fillText(`Born ${model.year}`,w*.08,h*.22);c.font=`600 ${w*.09}px Georgia`;textLines(c,model.country,w*.08,h*.35,w*.84,w*.11,3);
 c.font=`${w*.04}px sans-serif`;textLines(c,model.name,w*.08,h*.59,w*.84,w*.05,2);c.font=`600 ${w*.07}px sans-serif`;c.fillText(`${model.percent.toFixed(2)}%`,w*.08,h*.73);c.font=`${w*.028}px sans-serif`;textLines(c,'Share of birth-weighted draws in the game. National averages do not predict an individual life.',w*.08,h*.78,w*.84,w*.04,3);c.fillText('Play free · 1in8bn.com/together/',w*.08,h*.94);
}
