import test from 'node:test';import assert from 'node:assert/strict';
import {buildMajorOffer,resolveMajor,majorAdmissionProbability,majorCompetition,shortageMajor,type MajorFacts} from '../src/game/university-major';
const base:MajorFacts={knowledge:60,quintile:3,ppp:30000,internet:80,night:false,graduate:false,sportBackground:false,rich:false,hobbies:[],talents:{body:0,art:0,music:0,hands:0,words:0},shownTalents:[]};
test('ordinary offer has five unique available majors and never military or unauditioned arts',()=>{
 const offer=buildMajorOffer({...base,knowledge:30,internet:20},()=>.2);
 assert.equal(offer.options.length,5);assert.equal(new Set(offer.options).size,5);
 for(const major of ['med','mil','mus','dnc','law','cs'])assert.ok(!offer.options.includes(major as any),major);
});
test('medicine gate and sporting background preserve an entry within the five choices',()=>{
 const offer=buildMajorOffer({...base,knowledge:100,sportBackground:true},()=>0);
 assert.equal(offer.options.length,5);assert.equal(offer.options[0],'med');assert.ok(offer.options.includes('pe'));
 assert.equal(buildMajorOffer({...base,knowledge:100,night:true},()=>0).medicineOffered,false);
});
test('long-term hobbies and degree dreams receive protected positions',()=>{
 const offer=buildMajorOffer({...base,sportBackground:true,degreeDreamJob:'engineer',hobbies:[{id:'reading',since:8,level:4}]},()=>.99);
 for(const major of ['pe','hum','eng'])assert.ok(offer.options.includes(major as any),major);
 assert.deepEqual(offer.preferred,['hum','eng']);
});
test('audition requires early training plus family, talent or arts-school support',()=>{
 const hobby={id:'music',since:15,level:3};
 assert.ok(!buildMajorOffer({...base,hobbies:[hobby]},()=>.1).options.includes('mus'));
 assert.ok(buildMajorOffer({...base,rich:true,hobbies:[hobby]},()=>.1).options.includes('mus'));
 assert.ok(!buildMajorOffer({...base,rich:true,graduate:true,hobbies:[hobby]},()=>.1).options.includes('mus'));
 assert.ok(!buildMajorOffer({...base,rich:true,hobbies:[{...hobby,since:16}]},()=>.1).options.includes('mus'));
});
test('competitive rejection prefers an offered noncompetitive childhood interest',()=>{
 const offer={options:['cs','hum','biz','eng','nurse'] as const,preferred:['hum'] as const,medicineOffered:false,auditions:[]};
 const copy={...offer,options:[...offer.options],preferred:[...offer.preferred]};let calls=0;
 const r=resolveMajor(base,copy,'cs',()=>{calls++;return .99;});
 assert.equal(r.major,'hum');assert.equal(r.outcome,'competitiveRejected');assert.equal(r.happiness,-3);assert.equal(calls,1);
 assert.equal(resolveMajor(base,copy,'med',()=>{throw Error('unoffered draw');}),null);
});
test('music audition success improves the trained hobby and failure chooses an arts alternative',()=>{
 const facts={...base,rich:true,hobbies:[{id:'music',since:8,level:5}]},offer=buildMajorOffer(facts,()=>.1);
 const yes=resolveMajor(facts,offer,'mus',()=>0);assert.equal(yes.outcome,'auditionAccepted');assert.deepEqual(yes.hobbyGain,{id:'music',amount:1});
 let calls=0;const no=resolveMajor(facts,offer,'mus',()=>++calls===1?.99:0);assert.equal(no.major,'art');assert.equal(no.happiness,-4);assert.equal(calls,2);
});

test('only observed strong talent creates a preference, and a childhood hobby takes priority',()=>{
 const facts={...base,talents:{...base.talents,hands:1.5,words:1.2},shownTalents:['words','hands'] as MajorFacts['shownTalents']};
 const offer=buildMajorOffer(facts,()=>.99);assert.equal(offer.talent,'hands');assert.ok(offer.options.includes('eng'));
 assert.equal(buildMajorOffer({...facts,shownTalents:[]},()=>.99).talent,undefined);
 const hobby=buildMajorOffer({...facts,hobbies:[{id:'reading',since:18,level:2}]},()=>.99);assert.equal(hobby.talent,undefined);assert.equal(hobby.hobby?.major,'hum');
 assert.equal(buildMajorOffer({...base,hobbies:[{id:'reading',since:19,level:9}]},()=>.99).hobby,undefined);
});
test('computer science uses the stricter competition only above the PPP boundary',()=>{
 assert.equal(majorCompetition({...base,ppp:15000},'cs'),1);assert.equal(majorCompetition({...base,ppp:15001},'cs'),2);
 assert.equal(majorAdmissionProbability(base,'law'),.45);assert.equal(majorAdmissionProbability({...base,knowledge:0},'law'),.1);
 assert.equal(majorAdmissionProbability({...base,knowledge:100,quintile:5},'eng'),.98);
 for(const major of ['med','nurse','eng','cs'] as const)assert.equal(shortageMajor(major),true);
 assert.equal(shortageMajor('sci'),false);assert.equal(shortageMajor(undefined),false);
});
test('noncompetitive selection consumes no random draw, and a strict competitive threshold rejects',()=>{
 const offer={options:['hum','law'] as ('hum'|'law')[],preferred:[],medicineOffered:false,auditions:[]};
 assert.deepEqual(resolveMajor(base,offer,'hum',()=>{throw Error('unexpected draw');}),{major:'hum',outcome:'chosen',knowledge:2,happiness:0});
 let draws=0;assert.equal(resolveMajor(base,offer,'law',()=>++draws===1?.45:0)?.outcome,'competitiveRejected');assert.equal(draws,2);
});
test('dance training and arts-school evidence use their own eligibility boundaries',()=>{
 const facts={...base,hobbies:[{id:'dance',since:12,level:4.5}],artsSchool:true};
 assert.ok(buildMajorOffer(facts,()=>.99).options.includes('dnc'));
 assert.ok(!buildMajorOffer({...facts,artsHobbyId:'music'},()=>.99).options.includes('dnc'));
 assert.ok(!buildMajorOffer({...facts,hobbies:[{id:'dance',since:12,level:4.49}]},()=>.99).options.includes('dnc'));
});
test('offers remain unique across varied seeded draws with protected sports and both auditions',()=>{
 for(let seed=1;seed<=100;seed++){
  let state=seed;const draw=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/2**32;};
  const offer=buildMajorOffer({...base,knowledge:99,sportBackground:true,rich:true,hobbies:[{id:'music',since:8,level:6},{id:'dance',since:8,level:6}],degreeDreamJob:'engineer'},draw);
  assert.equal(offer.options.length,5);assert.equal(new Set(offer.options).size,5);assert.ok(offer.options.includes('pe'));assert.ok(!offer.options.includes('mil'));
 }
});
