import { countryName } from '../game/countries';
import type { DuoSnapshot } from './duo-engine';
import { drawPortrait, textLines } from './life-media';
import { drawShareQr } from './share-qr';

import { DUO_PUBLIC_URL } from './duo-public';
export { DUO_PUBLIC_URL };
export const DUO_CARD_FILENAME='1in8bn-together-story.png';
const choices={career:'I followed a work opportunity',study:'I made time to learn',care:'I chose time and connection'};
const clean=(s:string)=>s.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,80);
export function duoPortraitSeed(value:string){let seed=7;for(const char of value)seed=(seed*31+char.charCodeAt(0))>>>0;return seed;}
/** A deliberately narrow projection: never pass the room snapshot to image metadata or share URLs. */
export function duoShareModel(snapshot:DuoSnapshot){
 const own=snapshot.self;
 const full=snapshot.lifetime;
 if(full){const life=full.self.life;return {fullLife:true,name:clean(life.name||own.name),seed:life.seed,age:life.age,origin:countryName(life.migration.birthCountry,'en'),hasOrigin:true,money:life.stats.netAssets,job:life.stats.job,wellbeing:life.stats.happiness,chapters:[{age:0,heading:`Born in ${life.birthYear}`,home:countryName(life.migration.birthCountry,'en')},{age:life.age,heading:life.alive?'My life is still unfolding':'A complete life, remembered',home:`${life.year} · My choices shaped my own path`},{age:life.age,heading:`${full.memories.length} shared memories`,home:'The private details stay between us'}]};}
 return {fullLife:false,name:clean(own.name),seed:duoPortraitSeed(own.id),age:snapshot.age,origin:own.origin?.countryName??'Starting place not recorded',hasOrigin:!!own.origin,
  money:own.life.money,job:clean(own.life.job),wellbeing:Math.max(0,Math.min(100,own.life.wellbeing)),
  chapters:snapshot.history.slice(0,3).map(h=>({age:h.age,heading:choices[h.choice],home:h.residence==='together'?'We shared a home':'We kept separate homes'}))};
}
export type DuoShareModel=ReturnType<typeof duoShareModel>;
export function duoSharePayload(model:DuoShareModel){
 const n=model.chapters.length;
 return {title:'A life, together · 1in8bn',url:DUO_PUBLIC_URL,text:`${model.fullLife?'A friend and I lived two independent lives from birth.':`A friend and I played through ${n} turning ${n===1?'point':'points'} in a shared life story.`}\n${model.hasOrigin?`My starting place: ${model.origin}.`:'This earlier story has no recorded starting place.'}\n${model.chapters.map(c=>`At ${c.age}: ${c.heading}. ${c.home}.`).join('\n')}\nWhat would we choose together? Play free: ${DUO_PUBLIC_URL}`};
}
export function duoComposerText(card:ReturnType<typeof duoSharePayload>){return card.text.replace(` Play free: ${card.url}`,'').trim();}
export type DuoPreparedCard=ReturnType<typeof duoSharePayload>&{file:File};
type ShareBrowser={canShare?:(data:ShareData)=>boolean;share?:(data:ShareData)=>Promise<void>};
/** No await before share(): the prepared file preserves the phone tap's transient activation. */
export async function sharePreparedDuoCard(card:DuoPreparedCard,browser:ShareBrowser=navigator):Promise<'shared'|'cancelled'|'unsupported'|'failed'>{
 try{if(!browser.share||!browser.canShare?.({files:[card.file]}))return 'unsupported';await browser.share({files:[card.file],title:card.title,text:duoComposerText(card),url:card.url});return 'shared';}
 catch(error){return error instanceof Error&&error.name==='AbortError'?'cancelled':'failed';}
}
const ink='#172d43',teal='#245f67',muted='#5c6873',paper='#fffdf8',sans='"IBM Plex Sans",sans-serif',serif='"Hahmlet",Georgia,serif';
export function drawDuoKeepsake(canvas:HTMLCanvasElement,model:DuoShareModel){
 const c=canvas.getContext('2d');if(!c)throw Error('Image preview unavailable');const w=canvas.width,h=canvas.height;
 c.save();c.scale(w/1080,h/1350);c.fillStyle='#f4f1eb';c.fillRect(0,0,1080,1350);c.fillStyle=paper;c.fillRect(40,40,1000,1270);
 c.fillStyle=teal;c.fillRect(40,40,1000,8);c.font=`600 26px ${sans}`;c.fillText('1in8bn.com',76,100);
 c.fillStyle=ink;c.font=`500 66px ${serif}`;c.fillText('A life, together.',76,188);c.fillStyle=muted;c.font=`27px ${sans}`;c.fillText('Two people. Choices that stayed with me.',76,236);
 c.fillStyle='#e8dfce';c.fillRect(76,276,928,250);c.fillStyle='#bdceca';c.fillRect(76,414,928,112);
 c.fillStyle=paper;c.fillRect(166,294,170,205);drawPortrait(c,{seed:model.seed,age:model.age,sex:'M'},170,300,160);
 c.fillStyle='#e9e3d6';c.fillRect(744,294,170,205);drawPortrait(c,{seed:duoPortraitSeed('an-invited-friend'),age:model.age,sex:'M'},750,300,160);
 c.fillStyle=ink;c.font=`18px ${sans}`;c.fillText('My character',170,518);c.fillText('A friend (illustration)',750,518);
 c.strokeStyle=teal;c.lineWidth=3;c.setLineDash([8,10]);c.beginPath();c.moveTo(374,392);c.lineTo(706,392);c.stroke();c.setLineDash([]);
 c.fillStyle=ink;c.font=`500 45px ${serif}`;textLines(c,model.name,76,590,928,52,1);
 c.fillStyle=teal;c.font=`28px ${sans}`;textLines(c,model.origin,76,636,928,34,1);
 c.fillStyle='#f0ede4';c.fillRect(76,672,928,100);c.fillStyle=muted;c.font=`20px ${sans}`;c.fillText(model.fullLife?'MY NET WORTH · US PRICES (PPP)':'MY RESOURCES · FICTIONAL CREDITS',100,707);c.fillText('MY WELLBEING',670,707);
 c.fillStyle=ink;c.font=`600 35px ${sans}`;c.fillText(Math.round(model.money).toLocaleString('en-US'),100,751);c.fillText(`${Math.round(model.wellbeing)} / 100`,670,751);
 model.chapters.forEach((chapter,i)=>{const y=820+i*104;c.fillStyle=teal;c.font=`600 23px ${sans}`;c.fillText(`AGE ${chapter.age}`,76,y);c.fillStyle=ink;c.font=`500 29px ${sans}`;textLines(c,chapter.heading,225,y,775,35,1);c.fillStyle=muted;c.font=`24px ${sans}`;c.fillText(chapter.home,225,y+36);});
 c.strokeStyle='#d9d6cd';c.lineWidth=1;c.beginPath();c.moveTo(76,1147);c.lineTo(1004,1147);c.stroke();c.fillStyle=teal;c.font=`600 31px ${sans}`;c.fillText('1in8bn.com',76,1210);c.fillStyle=muted;c.font=`23px ${sans}`;c.fillText('Invite a friend. Make your own story.',76,1250);drawShareQr(c,DUO_PUBLIC_URL,850,1170,130);c.restore();
}
/** Public generic OG art contains no room or character data, even when an invite is crawled. */
export function drawDuoOg(canvas:HTMLCanvasElement){
 const c=canvas.getContext('2d');if(!c)throw Error('Image generation unavailable');c.fillStyle='#f4f1eb';c.fillRect(0,0,1200,630);c.fillStyle=teal;c.fillRect(0,0,1200,10);
 c.fillStyle=teal;c.font=`600 29px ${sans}`;c.fillText('1in8bn.com',70,85);c.fillStyle=ink;c.font=`500 76px ${serif}`;c.fillText('A life,',70,221);c.fillText('together.',70,315);c.font=`30px ${sans}`;c.fillText('Your choices. A shared story.',74,390);c.fillStyle=teal;c.font=`600 26px ${sans}`;c.fillText('INVITE A FRIEND · FREE TO PLAY',74,516);
 c.fillStyle='#e7dfcf';c.fillRect(665,126,465,380);c.fillStyle='#b8cbc3';c.fillRect(665,371,465,135);c.fillStyle=paper;c.fillRect(690,203,177,216);c.fillRect(926,203,177,216);
 drawPortrait(c,{seed:3841,age:25,sex:'M'},698,216,160);drawPortrait(c,{seed:4582,age:25,sex:'F'},934,216,160);c.fillStyle=muted;c.font=`22px ${sans}`;c.fillText('Two lives. A lifetime of choices.',690,555);
}
