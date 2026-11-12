import test from 'node:test';
import assert from 'node:assert/strict';
import {custodyFeedCandidates} from '../src/game/custody-feed';
import {newFeedState,planAnnualFeed,fireNextFeed} from '../src/game/annual-feed';
import {createLife,DEFAULT_SETTINGS} from '../src/game/engine';
import {naturalFamily} from './helpers/adult-family-simulation';
test('visit uses weight30 eligibility gate and changes bond without inventing a deposit fee',()=>{
 const life=[...naturalFamily(1)].find(l=>!l.pendingDecision&&l.family.children.some(c=>c.alive&&c.age===25))!;
 const child=life.family.children.find(c=>c.alive&&c.age===25)!;
 const progress=life.descendants.children.find(c=>c.childId===child.id)!;
 progress.prison={startYear:life.year-1,endYear:life.year+2,releasedYear:null};
 const events:string[]=[];const list=custodyFeedCandidates(life,{random:()=>0,event:key=>events.push(key)});
 const visit=list.find(c=>c.id==='kidpr_v')!;assert.equal(visit.weight,30);assert.equal(visit.gap,1);assert.equal(visit.repeatable,true);
 let probability=0;assert.equal(visit.eligible(p=>{probability=p;return true}),true);assert.equal(probability,.6);
 const feed=newFeedState();planAnnualFeed(feed,life.year,life.age,[visit],()=>0);
 const before={money:life.stats.savings,h:life.stats.happiness,bond:progress.bond??0};
 assert.equal(fireNextFeed(feed,life.year,life.age,list,()=>0),'kidpr_v');
 assert.equal(life.stats.savings,before.money);assert.equal(progress.bond,before.bond+1);assert.equal(life.stats.happiness,before.h-1);
 assert.equal(events.length,1);
});
test('player prison feed excludes free-life visits and applies learning effects',()=>{
 const life=createLife(DEFAULT_SETTINGS,1);life.age=30;life.year=life.birthYear+30;life.justice.prisonUntil=32;
 const events:string[]=[];const list=custodyFeedCandidates(life,{random:()=>0,event:key=>events.push(key)});
 assert.equal(list.find(c=>c.id==='kidpr_v')!.eligible(()=>true),false);
 const learn=list.find(c=>c.id==='pr_learn')!;assert.equal(learn.eligible(()=>true),true);
 const before=life.stats.knowledge;const feed=newFeedState();planAnnualFeed(feed,life.year,life.age,[learn],()=>0);fireNextFeed(feed,life.year,life.age,list,()=>0);
 assert.equal(life.stats.knowledge,before+4);assert.equal(events.length,1);
 life.justice.prisonUntil=null;assert.equal(learn.eligible(()=>true),false);
});
