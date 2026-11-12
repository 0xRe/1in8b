import test from 'node:test';
import assert from 'node:assert/strict';
import {planUpperSecondary, resolveUpperSecondary, selectSpecialistSchool} from '../src/game/upper-secondary';
const base={country:'UGA',birthCountry:'UGA',year:2026,age:15,transition:.6,quintile:2,knowledgeZ:0,knowledge:50,urban:true,homeSchool:false,refugeeCamp:false,refugee:false,irregular:false,returning:false,specialist:null};
const noDraw=()=>{throw Error('unexpected draw');};
function draws(...values:number[]){let i=0;return ()=>{assert.ok(i<values.length,'extra draw');return values[i++];};}
test('upper-secondary placement preserves homeschool and camp precedence and PRK free entry',()=>{
 assert.equal(planUpperSecondary({...base,homeSchool:true,refugeeCamp:true}).kind,'enrolled');
 assert.equal(planUpperSecondary({...base,refugeeCamp:true,age:14}).kind,'childwork');
 assert.equal(planUpperSecondary({...base,refugeeCamp:true}).kind,'seeking');
 assert.equal(planUpperSecondary({...base,country:'PRK',year:1974}).kind,'choice');
 assert.equal(planUpperSecondary({...base,country:'PRK',year:1975}).kind,'enrolled');
 assert.equal(planUpperSecondary({...base,country:'PRK',refugee:true}).kind,'choice');
});
test('free reforms and high completion remove work choice without claiming automatic ordinary entry',()=>{
 assert.deepEqual(planUpperSecondary({...base,country:'USA',year:1999}).choices,['go','voc','work']);
 assert.deepEqual(planUpperSecondary({...base,country:'USA',year:2000}).choices,['go','voc']);
 assert.deepEqual(planUpperSecondary({...base,country:'USA',irregular:true}).choices,['go','voc','work']);
 assert.deepEqual(planUpperSecondary({...base,transition:.96}).choices,['go','voc','work']);
 assert.deepEqual(planUpperSecondary({...base,transition:.97}).choices,['go','voc']);
 assert.deepEqual(planUpperSecondary({...base,transition:.97,quintile:1}).choices,['go','voc','work']);
 assert.deepEqual(planUpperSecondary({...base,transition:.97,quintile:1,birthCountry:'JPN'}).choices,['go','voc']);
 const r=resolveUpperSecondary({...base,country:'USA'},'voc',noDraw)!;
 assert.equal(r.stage,'vocational');assert.ok(r.retention!>0&&r.retention!<1);
 assert.equal(resolveUpperSecondary({...base,country:'USA'},'work',noDraw),null);
});
test('work preserves returning employment and forces paid childwork only below fifteen',()=>{
 assert.equal(resolveUpperSecondary({...base,returning:true},'work',noDraw)?.kind,'keepWork');
 assert.equal(resolveUpperSecondary({...base,age:14},'work',noDraw)?.forcePaid,true);
 assert.equal(resolveUpperSecondary(base,'work',noDraw)?.kind,'seeking');
 assert.equal(resolveUpperSecondary({...base,homeSchool:true},'go',noDraw),null);
});
test('vocational admission and fallback are distinct; Japan fallback remains general school',()=>{
 // With z=0, age15 and transition .6, academic odds=.7113, vocational=.8839.
 assert.equal(resolveUpperSecondary(base,'go',draws(.8))?.kind,'seeking');
 assert.equal(resolveUpperSecondary(base,'voc',draws(.8))?.stage,'vocational');
 assert.equal(resolveUpperSecondary({...base,transition:.91},'go',draws(.999,.97))?.stage,'vocational');
 assert.equal(resolveUpperSecondary({...base,transition:.91,birthCountry:'JPN'},'go',draws(.999,.97))?.stage,'upperSecondary');
 assert.equal(resolveUpperSecondary({...base,transition:.9},'go',draws(.999))?.happiness,-6);
 assert.equal(resolveUpperSecondary({...base,transition:.91},'voc',draws(.999))?.happiness,-6);
});
test('specialist candidacy uses early established hobbies, household-independent entry and arts tie break',()=>{
 const hobbies=[{id:'art',since:13,level:3},{id:'sp_swim',since:10,level:3},{id:'music',since:14,level:9}];
 assert.equal(selectSpecialistSchool(7999,false,hobbies),null);
 assert.equal(selectSpecialistSchool(8000,true,hobbies),null);
 assert.deepEqual(selectSpecialistSchool(8000,false,hobbies),{kind:'art',hobby:'art',level:3});
 assert.deepEqual(selectSpecialistSchool(8000,false,[{id:'sport',since:12,level:4},...hobbies]),{kind:'sport',hobby:'sport',level:4});
});
test('specialist failure continues ordinary admission and accumulates effects without free-policy draw',()=>{
 const c={...base,specialist:{kind:'art' as const,hobby:'art',level:3}};
 assert.deepEqual(planUpperSecondary(c).choices,['go','arts','voc','work']);
 const accepted=resolveUpperSecondary(c,'arts',draws(.2))!;
 assert.equal(accepted.stage,'upperSecondary');assert.equal(accepted.happiness,5);assert.equal(accepted.hobbyGain,2);
 assert.equal(accepted.specialist?.hobby,'art');assert.equal(accepted.retention,undefined);
 assert.equal(resolveUpperSecondary({...c,urban:false},'arts',draws(.21,.99))?.happiness,-9);
 const fallback=resolveUpperSecondary({...c,country:'USA'},'arts',draws(.99))!;
 assert.equal(fallback.stage,'upperSecondary');assert.equal(fallback.happiness,-3);assert.ok(fallback.retention);
 assert.equal(resolveUpperSecondary(base,'arts',noDraw),null);
});
