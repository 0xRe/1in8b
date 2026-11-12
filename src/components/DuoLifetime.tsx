import { localePath } from '../lib/site-url';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BookOpen, HeartHandshake, MessageCircle, Images, Pause, LogOut, Play, Users, Check, Share2, Moon, Sun, X } from 'lucide-react';
import type { LifeAction } from '../lib/duo-lifetime';
import { newFocusOptions } from '../game/school-focus';
import type { DuoSnapshot, DuoCommand } from '../lib/duo-engine';
import { translator, type Locale } from '../lib/i18n';
import { countryName } from '../game/countries';
import { Portrait, Scene } from './Visuals';
import { DuoVoice } from './DuoVoice';
import { DuoBirthReveal } from './DuoBirthReveal';
import { MoneyRegionSelect } from './MoneyRegionSelect';
import { MONEY_REGIONS, MONEY_PREFERENCE, readMoneyRegion, type MoneyRegion } from '../lib/money-display';
import { DuoKeepsake } from './DuoKeepsake';
import { DuoSelect } from './DuoSelect';
import { DuoChat } from './DuoChat';
import { DuoSharedChoice } from './DuoSharedChoice';
import { LifeDetails, Budget } from './GameDetails';
import { Healthcare } from './Healthcare';
import './duo-lifetime.css';

type Command = DuoCommand extends infer C ? C extends {id:string} ? Omit<C,'id'|'runIndex'|'stage'> : never : never;
type Tab = 'life'|'shared'|'chat'|'memories';
const tabs = [{id:'life',label:'Life',icon:BookOpen},{id:'shared',label:'Together',icon:HeartHandshake},{id:'chat',label:'Chat',icon:MessageCircle},{id:'memories',label:'Memories',icon:Images}] as const;
/** Matches the solo game: phones get bottom tabs, wider screens get one page with columns. */
const WIDE_QUERY = '(min-width: 841px)';
function wideScreen(){try{return typeof window!=='undefined'&&typeof window.matchMedia==='function'&&window.matchMedia(WIDE_QUERY).matches;}catch{return false;}}
function initial(name:string){return Array.from(name.trim())[0]?.toUpperCase()??'?';}
const RELATIONSHIP={single:'Single',dating:'Dating',cohabiting:'Living together',married:'Married'} as const;
export function DuoLifetime({snapshot:s,roomId,token,busy,connected,terminal,error,notice,announcement,command,shareInvite,renewInvite,inviteAvailable,manualInvite,onVoice,leave,reconnect,locale='en'}:{snapshot:DuoSnapshot;roomId:string;token:string;busy:boolean;connected:boolean;terminal:boolean;error:string;notice:string;announcement:string;command:(c:Command)=>Promise<boolean>;shareInvite:()=>Promise<void>;renewInvite:()=>Promise<void>;inviteAvailable:boolean;manualInvite:string;onVoice:(v:boolean)=>void;leave:()=>void;reconnect:()=>void;locale?:Locale}) {
 const [moneyRegion,setMoneyRegion]=useState<MoneyRegion>('USD');
 useEffect(()=>{let storage:Storage|null=null;try{storage=window.localStorage;}catch{}setMoneyRegion(readMoneyRegion(storage,Intl.DateTimeFormat().resolvedOptions().timeZone,navigator.languages));},[]);
 const t=useMemo(()=>translator(locale,moneyRegion),[locale,moneyRegion]);
 const [birthOpen,setBirthOpen]=useState(false),[readyMode,setReadyMode]=useState<'manual'|'auto'>('auto'),[sending,setSending]=useState(false);
 const [wide,setWide]=useState(wideScreen);
 useEffect(()=>{if(typeof window.matchMedia!=='function')return;const media=window.matchMedia(WIDE_QUERY);const update=()=>setWide(media.matches);update();media.addEventListener?.('change',update);return()=>media.removeEventListener?.('change',update);},[]);
 const [theme,setTheme]=useState<'light'|'dark'>('light');
 useEffect(()=>{setTheme(document.documentElement.dataset.theme==='dark'?'dark':'light');},[]);
 const pending=useRef(false);
 const suppliedCommand=command;
 command=async c=>{if(pending.current)return false;pending.current=true;setSending(true);try{return await suppliedCommand(c);}finally{pending.current=false;setSending(false);}};
 const f=s.lifetime!; const life=f.self.life; const [tab,setTab]=useState<Tab>('life'); const [chat,setChat]=useState(''); const [timelineOpen,setTimelineOpen]=useState(false); const [visible,setVisible]=useState(true); const [reflection,setReflection]=useState('');  const [close,setClose]=useState(false); const [choice,setChoice]=useState<{id:string;decision:string}|null>(null); const panel=useRef<HTMLDivElement>(null); const head=useRef<HTMLDivElement>(null); const shell=useRef<HTMLElement>(null); const positions=useRef<Partial<Record<Tab,number>>>({});
 const ended=terminal||s.phase==='closed'; const disabled=busy||sending||!connected||ended; const blocked=disabled||s.paused; const decision=life.pendingDecision; const shared=f.sharedEvent; const proposal=shared?.proposal; const agreed=proposal?.approvals.includes(s.self.id); const ownPause=s.pausedBy.includes(s.self.id); const complete=s.phase==='complete'; const waiting=s.phase==='waiting'; const alone=!s.partner;
 useEffect(()=>{const update=()=>setVisible(document.visibilityState!=='hidden');update();document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[]);
 const readKey = `1in8bn-duo-read:${roomId}:${s.self.id}`;
 const [lastRead, setLastRead] = useState('');
 const [keepsakeOpen, setKeepsakeOpen] = useState(false);
 useEffect(() => {
   try { setLastRead(localStorage.getItem(readKey) ?? ''); } catch { setLastRead(''); }
 }, [readKey]);
 const markRead = useCallback((id: string) => {
   setLastRead(id);
   try { localStorage.setItem(readKey, id); } catch { /* In-memory state still works. */ }
 }, [readKey]);
 const unread = s.messages.slice(s.messages.findIndex(message => message.id === lastRead) + 1)
   .filter(message => message.memberId !== s.self.id).length;
 async function leaveTemporarily() {
   if (connected && !waiting && !complete && !ended && !ownPause) {
     if (!await command({ kind: 'pause' })) return;
   }
   leave();
 }
 // The sticky "together" column sits below the sticky header, whose height changes as its controls wrap.
 useEffect(()=>{const node=head.current,root=shell.current;if(!wide||!node||!root||typeof ResizeObserver==='undefined')return;const observer=new ResizeObserver(()=>root.style.setProperty('--dl-head-height',`${node.offsetHeight}px`));observer.observe(node);return()=>observer.disconnect();},[wide]);
 const commandRef=useRef(command);commandRef.current=command;
 const playback=f.playback;
 useEffect(()=>{
  if(!playback?.running||!playback.driver||!f.canAdvance||blocked||!life.alive||!visible)return;
  const timer=setTimeout(()=>{if(document.visibilityState!=='hidden')void commandRef.current({kind:'life-advance',clockVersion:f.clockVersion,automatic:true});},Math.max(1500,playback.nextAdvanceAt-Date.now()));
  return()=>clearTimeout(timer);
 },[playback?.running,playback?.driver,playback?.nextAdvanceAt,f.clockVersion,f.canAdvance,blocked,life.alive,visible]);
 const endButton=useRef<HTMLButtonElement>(null); const confirmation=useRef<HTMLDivElement>(null);
 useEffect(()=>{setReflection('');setChoice(null);},[decision?.id,s.runIndex]);
 const birthRun=useRef(s.runIndex);
 useEffect(()=>{if(birthRun.current!==s.runIndex){birthRun.current=s.runIndex;setBirthOpen(true);}},[s.runIndex]);
 useEffect(()=>{if(ended)setClose(false);},[ended]);
 useEffect(()=>{if(!close)return;const panel=confirmation.current;panel?.querySelector<HTMLElement>('button')?.focus();const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'){setClose(false);endButton.current?.focus();}if(e.key==='Tab'&&panel){const buttons=Array.from(panel.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};document.addEventListener('keydown',onKey);return()=>document.removeEventListener('keydown',onKey);},[close]);
 function switchTab(next:Tab){
  setTab(next);
  if(wide){requestAnimationFrame(()=>document.getElementById(`dl-${next}`)?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}));return;}
  if(panel.current)positions.current[tab]=panel.current.scrollTop;
  requestAnimationFrame(()=>{if(panel.current)panel.current.scrollTop=positions.current[next]??0;});
 }
 function toggleTheme(){const next=theme==='dark'?'light':'dark';setTheme(next);document.documentElement.dataset.theme=next;try{localStorage.setItem('1in8bn-theme',next);}catch{}}
 const friend=s.partner?.name??'Your friend'; const mate=f.partner;
 const friendFace=s.partner&&mate?<span className={`dl-face ${s.partner.online?'is-here':''}`}><Portrait paths={mate.portrait}/></span>:s.partner?<span className={`dl-avatar ${s.partner.online?'is-here':''}`} aria-hidden="true">{initial(s.partner.name)}</span>:<span className="dl-avatar is-empty" aria-hidden="true"><Users size={18}/></span>;
 const friendStatus=!s.partner?'':!s.partner.online?'Away':!mate?'Here':!mate.alive?'Remembered':mate.pending?'Choosing':'Here';
 const nextActor=ended?'Room ended · your saved memories remain':waiting?s.partner?`${Number(s.self.ready)+Number(s.partner.ready)}/2 ready · ${!s.self.ready?'your turn to get ready':`${s.partner.name} is getting ready`}`:'Invite one friend to begin':!connected?'Connection interrupted · progress saved':!s.partner?.online?`${friend} is away · progress saved`:s.paused?ownPause?'Paused by you':`${friend} paused the story`:complete?'Both lives remembered':decision?'Your choice · the shared clock is waiting':shared?agreed?'Your agreement is saved · waiting for your friend':'A shared choice needs your attention':!life.alive?`${friend} continues their life`:f.partner?.pending?`${friend} is making a personal choice`:'Ready to continue your lives';
 const deliberate=decision?.type==='reflection'||!!decision?.key.startsWith('decision.health');
 const choose=()=>decision&&choice?.decision===decision.id&&command({kind:'life-choice',lifeVersion:f.self.version,decisionId:decision.id,choiceId:choice.id});
 // On wide screens every section is visible at once, so actions run in place instead of switching tabs.
 const onLife=wide||tab==='life',onMemories=wide||tab==='memories';
 const replayVoted=s.replayVotes.includes(s.self.id);
 let primary:{label:string;disabled?:boolean;run:()=>unknown}={label:playback?.running?'Lives unfolding…':playback?.mode==='auto'&&playback.votes.length===2?'Continue & resume auto':'Continue life',disabled:playback?.running||blocked||!f.canAdvance||!life.alive,run:()=>command({kind:'life-advance',clockVersion:f.clockVersion})};
 if(ended)primary={label:'Back to the beginning',run:leave};
 else if(waiting)primary=!s.partner?{label:inviteAvailable?'Share invitation':'Create fresh invitation',disabled,run:inviteAvailable?shareInvite:renewInvite}:{label:s.self.ready?'Ready · waiting for your friend':`Ready · ${readyMode==='auto'?'automatic':'manual'}`,disabled:disabled||s.self.ready,run:()=>command({kind:'ready',playback:readyMode})};
 else if(ownPause)primary={label:'Resume my life',disabled,run:()=>command({kind:'resume'})};
 else if(complete)primary={label:onMemories?(replayVoted?'Agreed · waiting for your friend':'Play again together'):'View our memories',disabled:onMemories&&(disabled||replayVoted||!s.partner?.online),run:()=>onMemories?command({kind:'replay'}):switchTab('memories')};
 else if(decision)primary=!onLife?{label:'View my choice',run:()=>switchTab('life')}:{label:decision.type==='reflection'?'Save reflection':choice?.decision===decision.id?'Confirm my choice':deliberate?'Choose an option above':'Tap an option to choose',disabled:blocked||(decision.type!=='reflection'&&choice?.decision!==decision.id),run:()=>decision.type==='reflection'?command({kind:'life-action',lifeVersion:f.self.version,action:'reflection',value:reflection}):choose()};
 else if(shared)primary=wide?{label:agreed?'Review our shared choice':'Respond to the shared choice',run:()=>switchTab('shared')}:{label:tab==='shared'?'Review and respond above':'View shared choice',disabled:tab==='shared',run:()=>switchTab('shared')};
 else if(!life.alive)primary={label:'Read my life story',run:()=>switchTab('memories')};
 function action(action:LifeAction,value?:string,amount?:number,secondary?:string){void command({kind:'life-action',lifeVersion:f.self.version,action,value,amount,secondary});}
 function download(){const text=[`1in8bn — ${s.self.name}`,`Born ${life.birthYear} · ${countryName(life.migration.birthCountry,'en')}`,`${life.alive?'Life so far':'Died'} at age ${life.age}`, ...life.events.map(e=>`${e.year} · Age ${e.age}: ${t(e.key,e.params)}`),'','Shared memories',...f.memories.map(m=>`${m.year}: ${m.title} — ${m.summary}`)].join('\n');const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=life.alive?'1in8bn-my-progress.txt':'1in8bn-my-full-life.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 const primaryButton=<button className="dl-primary" disabled={primary.disabled} onClick={()=>void primary.run()}>{busy?'Saving…':primary.label}</button>;

 const lobby=<div className="dl-lobby"><article className="dl-welcome"><p className="duo-eyebrow">TWO PEOPLE. TWO WHOLE LIVES.</p><h1>{s.partner?'You’re both here. Your lives are ahead.':'A lifetime is better with company.'}</h1><p className="dl-lead">Be born somewhere new. Make your own choices. Find the moments that bring you together.</p><div className="dl-lobby-scene"><Scene life={life} label="Your new life awaits"/></div><div className="dl-how"><div><span>01</span><strong>Invite your person</strong><p>Send a private link. Only the two of you can join.</p></div><div><span>02</span><strong>Live your own life</strong><p>Your country, family and choices are yours to discover.</p></div><div><span>03</span><strong>Meet along the way</strong><p>Talk freely and decide shared moments together.</p></div></div><details className="dl-lobby-birth"><summary>Discover our birthplaces</summary><p>You were born in {countryName(life.migration.birthCountry,'en')}.{s.partner?.origin?` ${s.partner.name} was born in ${s.partner.origin.countryName}.`:' Your friend’s birthplace appears after they join.'} Your personal birth card will be available in Our beginnings once you start.</p></details></article><aside className="dl-start-card"><p className="duo-eyebrow">YOUR PRIVATE ROOM</p><h2>{s.partner?'Two seats, ready to go.':'Save a seat for your friend.'}</h2><div className="dl-seat"><Portrait seed={life.seed} age={0} sex={life.sex}/><div><strong>{s.self.name} · You</strong><small>{s.self.ready?'Ready to begin':'Joined · choose your pace below'}</small></div>{s.self.ready&&<Check size={18}/>}</div><div className="dl-seat">{friendFace}<div><strong>{friend}</strong><small>{s.partner?s.partner.ready?'Ready to begin':'Joined · getting ready':'Not joined yet'}</small></div>{s.partner?.ready&&<Check size={18}/>}</div>
 {!s.partner&&<button className="dl-primary dl-invite" disabled={disabled} onClick={()=>void(inviteAvailable?shareInvite():renewInvite())}><Share2 size={18}/>{inviteAvailable?'Invite your friend':'Create fresh invitation'}</button>}
 {manualInvite&&<label>Private invitation<input readOnly value={manualInvite} onFocus={e=>e.target.select()}/></label>}
 <fieldset disabled={disabled||s.self.ready}><legend>Your life pace</legend><div className="dl-pace-options" role="group" aria-label="Your life pace">{(['auto','manual'] as const).map(mode=><button key={mode} aria-pressed={readyMode===mode} onClick={()=>setReadyMode(mode)}><strong>{mode==='auto'?'Automatic · recommended':'Manual'}</strong><small>{mode==='auto'?'Calm years flow; important choices wait.':'Advance each year at your own pace.'}</small></button>)}</div></fieldset>
 <p className="dl-start-note">Automatic life starts only with both friends’ agreement. Either person can pause. Voice is optional and has no extra time limit.</p>{s.partner&&<button className="dl-primary dl-invite" disabled={disabled||s.self.ready} onClick={()=>void command({kind:'ready',playback:readyMode})}>{s.self.ready?'You’re ready · waiting for your friend':`Ready · ${readyMode==='auto'?'automatic':'manual'}`}</button>}<small className="dl-lobby-foot">All features are free. Keep this browser to return to your life.</small></aside></div>;

 const story=<div className="dl-life-story">{birthOpen&&!waiting&&<DuoBirthReveal snapshot={s} onClose={()=>setBirthOpen(false)}/>}<div className={`dl-art ${decision?'dl-art-decision':''}`}><Scene life={life} label={`Your life at age ${life.age}`}/><span>{countryName(life.country,'en')} · {life.year}</span></div>
 <div className="dl-vitals"><span>Health <strong>{Math.round(life.stats.health)}</strong></span><span>Happiness <strong>{Math.round(life.stats.happiness)}</strong></span><span>Net worth · {MONEY_REGIONS[moneyRegion].label} prices <strong>{t.money(life.stats.netAssets)}</strong></span></div>
 {!life.alive&&<article className="dl-card"><h1>A life to remember.</h1><p>{life.name} lived {life.age} years. {life.cause?t(life.cause):''}</p><p>{f.partner?.alive?'Your friend’s life continues. Stay to talk and read the memories you shared. Their private choices remain theirs.':'Both lives have reached their endings.'}</p></article>}
 {decision?<article className="dl-card dl-decision" key={decision.id}><p className="duo-eyebrow">YOUR PERSONAL {decision.type==='reflection'?'REFLECTION':'CHOICE'} · AGE {life.age}</p><h1>{t(decision.key,decision.params)}</h1>{decision.key.startsWith('decision.health')&&<Healthcare life={life} t={t} locale="en" decision/>}{decision.type==='reflection'?<label>Your reflection<textarea maxLength={1000} value={reflection} onChange={e=>setReflection(e.target.value)}/><small>You may leave this blank and continue.</small></label>:<div className="dl-choices">{decision.choices.map(c=><button key={c.id} disabled={blocked} aria-pressed={choice?.decision===decision.id&&choice.id===c.id} onClick={()=>deliberate?setChoice({decision:decision.id,id:c.id}):void command({kind:'life-choice',lifeVersion:f.self.version,decisionId:decision.id,choiceId:c.id})}>{t(c.key,c.params)}</button>)}</div>}</article>:<article className="dl-card dl-now"><p className="duo-eyebrow">YOUR LIFE NOW</p><ol className="dl-recent">{life.events.slice(-3).reverse().map(e=><li key={e.id}><small>Age {e.age}</small><p>{t(e.key,e.params)}</p></li>)}</ol>{mate&&s.partner&&mate.recent[0]&&<div className="dl-friend-latest"><span className="dl-face"><Portrait paths={mate.portrait}/></span><p><small>Meanwhile · {mate.name} in {mate.country}, age {mate.recent[0].age}</small>{t(mate.recent[0].key,mate.recent[0].params)}</p></div>}{mate?.pending&&<p className="dl-muted">{friend} is choosing. You can read your story or chat while the shared clock waits.</p>}</article>}
 </div>;

 const passportCard=<article className="dl-card dl-passport"><p className="duo-eyebrow">MY LIFE · {life.year}</p><div className="dl-passport-person"><Portrait seed={life.seed} age={life.age} sex={life.sex}/><div><h2>{life.name}</h2><p>{life.alive?`Age ${life.age}`:`Remembered · ${life.age}`} · played by {s.self.name}</p></div></div><dl><div><dt>Born</dt><dd>{countryName(life.migration.birthCountry,'en')} · {life.birthYear}</dd></div><div><dt>Lives in</dt><dd>{countryName(life.country,'en')}</dd></div><div><dt>Occupation</dt><dd>{t(`job.${life.stats.job}`)}</dd></div></dl></article>;
 const detailsCards=<><details className="dl-card"><summary>My character, family & finances</summary><p>Born in {countryName(life.migration.birthCountry,'en')}. Now {t(`job.${life.stats.job}`)}.</p><p className="dl-muted">Money is shown at {MONEY_REGIONS[moneyRegion].label} prices for comparison. Personal assets are not shared with your friend.</p><MoneyRegionSelect value={moneyRegion} label="Amounts at local prices" onChange={region=>{setMoneyRegion(region);try{localStorage.setItem(MONEY_PREFERENCE,region);}catch{}}}/><LifeDetails life={life} t={t}/><Budget life={life} t={t}/><h3>Family</h3>{[...life.family.parents,...life.family.siblings,...(life.family.partner?[life.family.partner]:[]),...life.family.children].map(p=><p key={p.id}>{p.name} · {p.alive?`Age ${p.age}`:'Remembered'}</p>)}</details>
 {life.alive&&<details className="dl-card"><summary>Delegate routine choices</summary><p>Optional, for your character only. Health, treatment, money, work, relationships, migration and shared agreements always wait for your choice.</p><fieldset disabled={blocked}>{(['temperament','hobbies','reflections'] as const).map(category=><label key={category}><input type="checkbox" checked={f.self.delegation?.categories.includes(category)??false} onChange={e=>{const current=f.self.delegation?.categories??[];void command({kind:'life-delegation',lifeVersion:f.self.version,categories:e.target.checked?[...current,category]:current.filter(v=>v!==category)});}}/>{category==='temperament'?'Routine temperament choices':category==='hobbies'?'Routine hobby choices · normal game costs may apply':'Skip optional written reflections'}</label>)}</fieldset><small>{f.self.delegation?.resolvedCount??0} routine choices handled. {f.self.delegation?.lastOutcome}</small></details>}
 {life.alive&&<details className="dl-card"><summary>Shape my everyday life</summary><fieldset disabled={blocked||!!decision||!!shared}><DuoSelect label="Focus" value={life.stageFocus?.selection.current ?? ''}
   options={newFocusOptions(life).map(value => ({ value, label: t(`stageFocus.${value}`) }))}
   onChange={value => action('stage-focus', value)}/>
 <DuoSelect label="Investments" value={life.allocation}
   options={['cash','bonds','balanced','stocks','business'].map(value => ({ value, label: t(`allocation.${value}`) }))}
   onChange={value => action('invest', value)}/><DuoLifeActions life={life} action={action} t={t}/></fieldset></details>}
 </>;
 const context=<aside className="dl-life-context" aria-label="My character and everyday life">{passportCard}{detailsCards}</aside>;
 const friendCard=s.partner&&mate?<article className="dl-card dl-passport dl-friend-card"><p className="duo-eyebrow">{s.partner.name}’s life · {mate.year}</p><div className="dl-passport-person"><Portrait paths={mate.portrait}/><div><h2>{mate.name}</h2><p>{mate.alive?`Age ${mate.age}`:`Remembered · ${mate.age}`} · played by {s.partner.name}</p></div><span className={`dl-status is-${friendStatus.toLowerCase()}`}>{friendStatus}</span></div>
 {waiting?<p className="dl-muted">{s.partner.name}’s birthplace and story appear once you both begin.</p>:<><dl><div><dt>Born</dt><dd>{mate.birthCountry} · {mate.birthYear}</dd></div><div><dt>Lives in</dt><dd>{mate.country}</dd></div><div><dt>Occupation</dt><dd>{t(`job.${mate.job}`)}</dd></div>{mate.age>=16&&<div><dt>Family</dt><dd>{RELATIONSHIP[mate.relationship]}{mate.children?` · ${mate.children} ${mate.children===1?'child':'children'}`:''}</dd></div>}</dl>
 <div className="dl-friend-vitals"><span>Health <strong>{mate.health}</strong></span><span>Happiness <strong>{mate.happiness}</strong></span></div>
 {mate.recent.length>0&&<><h3>Recent moments</h3><ol className="dl-recent">{mate.recent.slice(0,3).map(e=><li key={e.id}><small>Age {e.age}</small><p>{t(e.key,e.params)}</p></li>)}</ol></>}
 <small className="dl-friend-note">Money, medical details, private choices and reflections stay with {s.partner.name}.</small></>}</article>:null;

 const sharedCard = <DuoSharedChoice lifetime={f} self={s.self.id} blocked={blocked} command={command}/>;
 const chatCard = <DuoChat messages={s.messages} self={s.self.id} active={wide || tab === 'chat'}
   disabled={disabled} ended={ended} unread={unread} onRead={markRead} draft={chat} setDraft={setChat}
   send={async text => {
     const ok = await command({ kind: 'chat', text });
     if (ok) setChat(current => current.trim() === text ? '' : current);
     return ok;
   }}/>;

 const memoriesCard=<article className="dl-card dl-memories-card"><h1>{complete?'Two lives, remembered.':'The years we carry.'}</h1><p>Your life so far is recorded below. Your friend’s private history is not included.</p><button onClick={download}>{life.alive?'Save my progress':'Download my complete story'}</button>{life.age > 0 && <details className="dl-keepsake-disclosure" onToggle={event => setKeepsakeOpen(event.currentTarget.open)}>
   <summary>Prepare my share card</summary>
   {keepsakeOpen && <DuoKeepsake snapshot={s}/>}
 </details>}{f.self.archives.length>0&&<details><summary>Previous lives ({f.self.archives.length})</summary>{f.self.archives.map(old=><div key={old.id}><h3>{old.name} · {old.birthYear}–{old.year}</h3>{old.events.map(e=><p key={e.id}>Age {e.age}: {t(e.key,e.params)}</p>)}</div>)}</details>}<h2>Our shared moments</h2>{f.memories.length?f.memories.map((m,i)=><p key={`${m.year}-${i}`}><strong>{m.year} · {m.title}</strong><br/>{m.summary}</p>):<p className="dl-muted">Your shared memories will appear here.</p>}<details onToggle={e=>setTimelineOpen(e.currentTarget.open)}><summary>My full timeline · {life.events.length} moments</summary><ol className="dl-timeline">{timelineOpen&&life.events.map(e=><li key={e.id}><small>{e.year} · Age {e.age}</small><p>{t(e.key,e.params)}</p></li>)}</ol></details></article>;

 return <main ref={shell} className={`duo-lifetime ${wide?'dl-wide':'dl-phone'} ${waiting?'dl-lobby-mode':''}`}><div className="dl-head" ref={head}><header className="dl-top">
 <a className="dl-brand" href={localePath(locale)}><span>1⁄8</span><strong>A life, together<small>{waiting?'1in8bn.com':`${f.worldYear} · ${life.settings.gentler?'Gentler life':'Classic life'}`}</small></strong></a>
 <div className="dl-players"><div className="dl-person"><Portrait seed={life.seed} age={life.age} sex={life.sex}/><div><strong>{s.self.name}<span className="dl-you">You</span></strong><small>{life.alive?`Age ${life.age}`:`Remembered · ${life.age}`}</small></div></div><span className="dl-link">&</span><div className="dl-person">{friendFace}<div><strong>{friend}</strong><small>{s.partner?`${friendStatus}${mate?.alive?` · Age ${mate.age}`:''}${mate&&!waiting?` · ${mate.country}`:''}`:'Waiting to join'}</small></div></div></div>
 <div className="dl-room-actions">{!waiting&&!ended&&<button disabled={disabled} onClick={()=>void command({kind:ownPause?'resume':'pause'})}>{ownPause?<Play size={16}/>:<Pause size={16}/>}<span>{ownPause?'Resume':'Pause'}</span></button>}<button type="button" aria-label={theme==='dark'?'Use light appearance':'Use dark appearance'} title="Appearance" onClick={toggleTheme}>{theme==='dark'?<Sun size={16}/>:<Moon size={16}/>}</button><button type="button" disabled={busy || sending} onClick={() => void leaveTemporarily()}
   aria-label={ended ? 'Leave room' : 'Leave temporarily'} title={ended ? 'Leave room' : 'Leave temporarily'}>
   <LogOut size={16}/><span>{ended ? 'Leave' : 'Leave temporarily'}</span>
 </button>{!ended && <button type="button" ref={endButton} onClick={() => setClose(true)}
   aria-label="End room" title="End room"><X size={16}/><span>End room</span></button>}</div></header>
 <div className="dl-tools">{!ended&&s.partner&&<DuoVoice compact roomId={roomId} memberToken={token} onActiveChange={onVoice}/>}{!waiting&&<><button onClick={()=>{setBirthOpen(true);switchTab('life');}}>Our beginnings</button>{!ended&&!complete&&playback&&<details><summary>Life pace</summary><div className="dl-playback"><span>{playback.running?'Automatic · stops at decisions':`Automatic life · ${playback.votes.length}/2 agreed`}</span><button disabled={disabled} onClick={()=>void command({kind:'life-playback',mode:playback.votes.includes(s.self.id)?'manual':'auto',clockVersion:f.clockVersion})}>{playback.votes.includes(s.self.id)?'Use manual / stop auto':'Agree to automatic life'}</button></div></details>}</>}{wide && !waiting && unread > 0 && <button className="dl-chat-alert" onClick={() => switchTab('chat')}>Chat <span className="dl-unread">{unread}</span></button>}{wide&&!waiting&&<div className="dl-header-action"><span aria-live="polite">{nextActor}</span>{primaryButton}</div>}</div>
 {error&&<div className="dl-error" role="alert"><span>{error}</span>{!ended&&<button onClick={reconnect}>Reconnect</button>}</div>}{notice&&<div className="dl-notice" role="status">{notice}</div>}<span className="duo-sr-only" role="status">{announcement}</span></div>
 {close&&<div className="dl-dialog-backdrop" onClick={e=>{if(e.target===e.currentTarget){setClose(false);endButton.current?.focus();}}}><div className="dl-confirm-dialog" ref={confirmation} role="dialog" aria-modal="true" aria-labelledby="dl-end-title"><h2 id="dl-end-title">{alone?'Close this room?':'End this room for both players?'}</h2><p>{alone?'Your private invitation will stop working. You can create a new room at any time.':'Your recorded lives remain available to save. Your friend will also leave this session.'}</p><div><button onClick={()=>{setClose(false);endButton.current?.focus();}}>Keep playing</button><button className="dl-danger" disabled={disabled} onClick={()=>void command({kind:'close'}).then(ok=>{if(ok)setClose(false);})}>{alone?'Close room':'End for both'}</button></div></div></div>}
 {wide?<div className="dl-content" ref={panel}>{waiting?<section className="dl-life-layout" id="dl-life" aria-label="Your private room">{lobby}</section>:<div className="dl-board">
  <div className="dl-col-me"><aside className="dl-life-context" aria-label="Our two lives">{passportCard}{friendCard}{detailsCards}</aside></div>
  <div className="dl-col-story">{shared&&<section id="dl-shared" aria-label="Shared choice">{sharedCard}</section>}<section id="dl-life" aria-label="My life">{story}</section><section id="dl-memories" aria-label="Memories">{memoriesCard}</section></div>
  <div className="dl-col-together">{!shared&&<section id="dl-shared" aria-label="Shared choices">{sharedCard}</section>}<section id="dl-chat" aria-label="Chat">{chatCard}</section></div>
 </div>}</div>:<>
 <nav className="dl-navigation" role="tablist" aria-label="Life together panels">{tabs.map((item,i)=><button key={item.id} id={`dl-tab-${item.id}`} role="tab" aria-selected={tab===item.id} aria-controls={`dl-${item.id}`} tabIndex={tab===item.id?0:-1} onKeyDown={e=>{if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();const at=e.key==='Home'?0:e.key==='End'?3:(i+(e.key==='ArrowRight'?1:3))%4;switchTab(tabs[at].id);document.getElementById(`dl-tab-${tabs[at].id}`)?.focus();}}} onClick={()=>switchTab(item.id)}><item.icon size={20} aria-hidden="true"/><span>{item.label}{item.id==='shared'&&shared?' •':''}</span>{item.id === 'chat' && unread > 0 && <span className="dl-unread" aria-label={unread + ' unread messages'}>{unread}</span>}</button>)}</nav>
 <div className="dl-content" ref={panel}>
 <section className="dl-life-layout" role="tabpanel" id="dl-life" aria-labelledby="dl-tab-life" hidden={tab!=='life'}>{waiting?lobby:<>{story}{context}</>}</section>
 <section role="tabpanel" id="dl-shared" aria-labelledby="dl-tab-shared" hidden={tab!=='shared'}>{sharedCard}{friendCard}</section>
 <section role="tabpanel" id="dl-chat" aria-labelledby="dl-tab-chat" hidden={tab!=='chat'}>{chatCard}</section>
 <section role="tabpanel" id="dl-memories" aria-labelledby="dl-tab-memories" hidden={tab!=='memories'}>{memoriesCard}</section>
 </div>
 <footer className="dl-bottom" hidden={waiting}><div className="dl-primary-row"><small aria-live="polite">{nextActor}</small>{primaryButton}</div></footer></>}
 </main>;
}
import type { Life } from '../game/types';
import { availableActivities, PET_KINDS, purchasePrice, relocationPrice, hobbySearchAvailable, hobbySearchPrice, hobbyTrainingPrice, activityPrice, requestJobOffers } from '../game/engine';
const LIFESTYLE_OPTIONS = { diet: ['balanced','healthy','convenient'], insurance: ['basic','full'], gifts: ['generous','modest','attendance'] } as const;
const SPENDING = ['health','education','experiences','giving','family'] as const;
const BELONGINGS = ['phone','bicycle','car','housing'] as const;
function DuoLifeActions({life,action,t}:{life:Life;t:ReturnType<typeof translator>;action:(action:LifeAction,value?:string,amount?:number,secondary?:string)=>void}) {
 const [pet,setPet]=useState('');
 function group(title:string,children:ReactNode){return <details><summary>{title}</summary><div className="dl-action-list">{children}</div></details>;}
 const owned=(category:typeof BELONGINGS[number])=>category==='phone'?life.belongings.phone:category==='housing'?life.belongings.housing==='owned':life.belongings.transport===category;
 const pausedSpending=life.hobbyState?.pausedSince!==undefined;
 return <>{availableActivities(life).length>0&&group('Family & life opportunities',<>{availableActivities(life).map(v=><button key={v} onClick={()=>action('activity',v)}>{t(`activity.${v}`)}</button>)}</>)}
 {group('Work & home',<>{life.age>=15&&<button disabled={requestJobOffers(life)===life} onClick={()=>action('job-offers')}>{t('ui.jobOffers')}</button>}{BELONGINGS.filter(v=>life.age>=(v==='phone'||v==='bicycle'?12:18)).map(v=><button disabled={owned(v)||life.stats.savings<purchasePrice(life,v)} key={v} onClick={()=>action('buy',v)}>{t(`ui.${v}`)} · {owned(v)?'✓':t.money(purchasePrice(life,v))}</button>)}{life.age>=18&&<button disabled={life.residence==='urban'||life.stats.savings<relocationPrice(life)} onClick={()=>action('relocate')}>{t('ui.relocate')} · {t.money(relocationPrice(life))}</button>}</>)}
 {group(t('ui.hobbies'),<>{hobbySearchAvailable(life)&&<button disabled={life.stats.savings<hobbySearchPrice(life)} onClick={()=>action('hobby-search')}>{t('hobby.find')} · {t.money(hobbySearchPrice(life))}</button>}{life.hobbies.map(h=><button key={h.id} onClick={()=>action('train-hobby',h.id)}>{t('ui.trainHobby')} · {t(`hobby.${h.id}`)} · {t.money(hobbyTrainingPrice(life,h.id))}</button>)}{life.hobbies.length>0&&<button onClick={()=>action('hobby-spending')}>{t(pausedSpending?'hobby.resumeSpending':'hobby.pauseSpending')}</button>}{life.hobbies.length>0&&<button aria-pressed={!!life.hobbyState?.automaticLessons} onClick={()=>action('hobby-lessons')}>{t('hobby.autoLessons')} · {life.hobbyState?.automaticLessons?'On':'Off'}</button>}</>)}
 {life.age>=18&&group(t('ui.lifestyle'),<>{(Object.keys(LIFESTYLE_OPTIONS) as (keyof typeof LIFESTYLE_OPTIONS)[]).map(key=><DuoSelect key={key} label={t(`ui.${key}`)} value={life.lifestyle[key]}
   options={LIFESTYLE_OPTIONS[key].map(value => ({ value, label: t(`lifestyle.${value}`) }))}
   onChange={value => action('lifestyle', key, undefined, value)}/>)}<p className="dl-muted">{t('ui.annualSpending')} · {t.moneyLabel}</p>{SPENDING.map(key=><label key={key}>{t(`spend${key[0].toUpperCase()+key.slice(1)}`)}<input key={`${life.id}-${key}-${t.moneyRegion}`} type="number" min="0" defaultValue={Math.round(t.displayAmount(life.annualSpending[key]))} onBlur={e=>{const n=Number(e.target.value);if(Number.isFinite(n)&&n>=0&&Math.abs(t.baseAmount(n)-life.annualSpending[key])>.5)action('annual-spending',key,t.baseAmount(n));}}/></label>)}</>)}
 {availableActivities(life).includes('adoptPet')&&group(t('activity.adoptPet'),<><label>Pet name<input value={pet} maxLength={24} onChange={e=>setPet(e.target.value)}/></label>{PET_KINDS.map(v=><button key={v} disabled={!pet.trim()} onClick={()=>action('pet',v,undefined,pet.trim())}>{t(`pet.${v}`)} · {t.money(activityPrice(life,'adoptPet'))}</button>)}</>)}</>;
}
