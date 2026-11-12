import {SPORT_NAMES,hobbyPracticeBlocked} from './named-sports';
import {hobbyDisplayId,hobbySidelineKey} from './physical-hobbies';
import type {Life,Hobby,HobbyId,EventParams} from './types';
import type {FeedCandidate} from './annual-feed';
import {hobbyDefinition,hobbyMedianIncome} from './hobby-catalog';
interface Hooks {event:(key:string,params?:EventParams)=>void}
function pending(life:Life):{hobby:Hobby;kind:'familiar'|'accomplished'}|null {
 const hobbies=life.hobbies.filter(h=>h.progress&&h.progress.milestonesSuppressedAge===undefined&&hobbyDefinition(h.id));
 const accomplished=hobbies.find(h=>h.progress!.level>=8&&h.progress!.milestones?.accomplishedAge===undefined);
 if(accomplished)return {hobby:accomplished,kind:'accomplished'};
 const familiar=hobbies.find(h=>h.progress!.level>=3&&h.progress!.milestones?.familiarAge===undefined);
 return familiar?{hobby:familiar,kind:'familiar'}:null;
}
/** Shares the ordinary weighted feed; reaching a level does not force a story that year. */
export function hobbyMilestoneCandidate(life:Life,hooks:Hooks):FeedCandidate {
 const eligible=()=>life.alive&&life.academics?.origin==='birth'&&life.age>=8&&life.age<=95&&!!pending(life);
 return {id:'hobbylv',minAge:8,maxAge:95,weight:3,eligible,run:()=>{
  if(!eligible())return;const {hobby,kind}=pending(life)!;
  if(hobbyPracticeBlocked(life,hobby.id)){
   hobby.progress!.milestonesSuppressedAge=life.age;
   if(hobby.progress!.sidelinesAge===undefined){hobby.progress!.sidelinesAge=life.age;hooks.event(hobbySidelineKey(hobby.id),{hobby:hobbyDisplayId(life,hobby.id)});}
   return;
  }
  (hobby.progress!.milestones??={})[kind==='accomplished'?'accomplishedAge':'familiarAge']=life.age;
  life.stats.happiness=Math.min(100,life.stats.happiness+(kind==='accomplished'?6:3));
  if(kind==='accomplished'){
   life.stats.social=Math.min(100,life.stats.social+3);
   if(hobby.id==='craft')life.hobbyState={...life.hobbyState,version:1,craftSalesSince:life.age};
  }
  const display=hobbyDisplayId(life,hobby.id);
  if(hobby.id.startsWith('sp_')&&kind==='accomplished'&&life.age>=65)hooks.event('event.hobbyMilestone.sportSenior',{hobby:display});
  else if(display!==hobby.id)hooks.event(`event.hobbyMilestone.adapted.${kind}`,{hobby:display});
  else hooks.event(`event.hobbyMilestone.${hobby.id}.${kind}`);
 }};
}
/** A saved craft-sale start persists across changing interests; no craft means no proceeds. */
export function annualCraftIncome(life:Life):number {
 if(life.academics?.origin!=='birth'||!life.alive||life.hobbyState?.craftSalesSince===undefined||life.age>=85||life.justice.prisonUntil!==null||!life.hobbies.some(h=>h.id==='craft'))return 0;
 return hobbyMedianIncome(life)*.03;
}
/** Independently authored scenes for the currently modeled general activities. */
export const HOBBY_MILESTONE_MESSAGES:Partial<Record<HobbyId,readonly[string,string]>>={
 ...Object.fromEntries(Object.entries(SPORT_NAMES).map(([id,name])=>[`sp_${id}`,[`${name} becomes a regular activity with a circle of familiar companions.`,`Your practice in ${name} earns recognition at a local sporting event.`]])),
 reading:['You find a reading circle where every book starts another conversation.','Your shelves become a small lending library for people nearby.'],
 music:['Regular rehearsals turn other musicians into friends.','You finish a public performance with the confidence to play again.'],
 sport:['A familiar group begins meeting you for regular games.','Your years of practice earn recognition at a community sports event.'],
 art:['You grow comfortable sharing your drawings with people you trust.','Your work becomes part of a local art display.'],
 craft:['A handmade present becomes your favourite way to mark an occasion.','People begin buying the things you make in your spare time.'],
 dance:['A dance group gives you a place to practise and belong.','You help bring a dance performance to a local audience.'],
 screen:['Discussing favourite programmes becomes a shared ritual with friends.','You develop a thoughtful eye for the stories you watch.'],
 sns:['You build a habit of keeping in touch across the distance.','Your online posts develop a small, regular audience.'],
 games:['You find a group of players whose company you enjoy.','Patient practice pays off at a neighbourhood gaming event.'],
 faith:['You find companionship through regular community gatherings.','Your community trusts you with a role helping people in need.'],
 fishing:['Familiar faces begin joining you by the water.','Other local anglers begin asking for your advice.'],
 cooking:['People look forward to the dishes you bring to the table.','You help prepare the food for a large community celebration.'],
 garden:['You have enough from your garden to share the harvest.','A flourishing garden becomes a source of neighbourhood pride.'],
 hiking:['Walking companions become part of your weekends.','You complete a demanding route you once hoped to attempt.'],
 travel:['Your journeys give familiar assumptions a wider perspective.','You become the person friends ask when planning a journey.'],
 board:['You find a regular table of people who enjoy the same games.','Your play earns a prize at a local board-game gathering.'],
 writing:['You gain the confidence to let others read your work.','A piece you wrote receives recognition in a local competition.'],
 drama:['Working on a play gives you a new circle of friends.','You take a leading part in a small theatre production.'],
 photo:['A group of photographers helps you notice the world differently.','One of your photographs is selected for a local exhibition.'],
 gym:['You find familiar training partners and a routine you enjoy.','Consistent training brings a change you can feel in your strength.'],
 karaoke:['Singing becomes a regular part of nights with friends.','You take a chance on a local singing contest and earn a prize.'],
};
