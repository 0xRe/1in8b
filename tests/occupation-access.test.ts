
import test from 'node:test';import assert from 'node:assert/strict';
import {occupationRejection,type OccupationAccessFacts} from '../src/game/occupation-access';
import {OCCUPATION_IDS} from '../src/game/occupations';
import {normalizeOccupationMarket,occupationAvailability,occupationFamily} from '../src/game/occupation-market';
const base:OccupationAccessFacts={age:25,country:'JPN',region:'hi',ppp:40000,urban:true,quintile:3,money:100000,medianIncome:20000,education:4,changingJobs:false,lateCareer:false,experience:{},training:[],sportBackground:false,artsOffers:[],blocked:[],eraAllowed:OCCUPATION_IDS,internetAllowed:OCCUPATION_IDS,rohingyaRefugee:false,stateless:false,noArmy:false,drivingSuspended:false,talibanWoman:false,guestWorker:false,migrant:false,naturalizedHere:false,recentDomesticUrbanMove:false,reindeerHerding:false,officer:false,mandatoryRetirement:false,irregular:false,papersValid:true,recordLicensePenalty:0,publicEmploymentBarred:false,civilAgeCap:null};
test('special entry and major gates preserve recorded arts and professional qualifications',()=>{
 assert.equal(occupationRejection(base,'athlete'),'specialEntry');assert.equal(occupationRejection({...base,major:'pe'},'coach'),null);
 assert.equal(occupationRejection({...base,artsOffers:['musician']},'musician'),null);
 assert.equal(occupationRejection({...base,major:'hum'},'nurse'),'major');assert.equal(occupationRejection({...base,major:'med'},'doctor'),null);
 assert.equal(occupationRejection(base,'doctor'),'education');
});
test('vocational and coding exceptions retain timing and one-level training limits',()=>{
 assert.equal(occupationRejection({...base,education:2,training:['electric']},'electric'),null);
 assert.equal(occupationRejection({...base,education:1,training:['electric']},'electric'),'education');
 assert.equal(occupationRejection({...base,education:1,codingQualified:true,codingQualificationAge:26},'dev'),'education');
 assert.equal(occupationRejection({...base,education:1,codingQualified:true,codingQualificationAge:25},'dev'),null);
});
test('aviation and seafaring preserve age boundaries, experience and officer exceptions',()=>{
 assert.equal(occupationRejection({...base,age:30},'pilot'),null);assert.equal(occupationRejection({...base,age:31},'pilot'),'age');
 assert.equal(occupationRejection({...base,age:50,officer:true,experience:{soldier:5}},'pilot'),null);
 assert.equal(occupationRejection({...base,age:40,currentJob:'fisher'},'seafarer'),null);
 assert.equal(occupationRejection({...base,age:41,currentJob:'fisher'},'seafarer'),'age');
 assert.equal(occupationRejection({...base,changingJobs:true},'cabin'),'age');
 assert.equal(occupationRejection({...base,changingJobs:true,experience:{cabin:1}},'cabin'),null);
});
test('country, technology and capital restrictions do not disappear for graduates',()=>{
 assert.equal(occupationRejection(base,'callc'),'region');assert.equal(occupationRejection({...base,country:'IND'},'callc'),null);
 assert.equal(occupationRejection({...base,internetAllowed:[]},'dev'),'internet');
 assert.equal(occupationRejection({...base,ppp:24999},'care'),'income');
 assert.equal(occupationRejection({...base,money:59999},'agbiz'),'capital');assert.equal(occupationRejection({...base,money:60000},'agbiz'),null);
});
test('migration, documentation, record and retirement gates remain independent',()=>{
 assert.equal(occupationRejection({...base,migrant:true},'civil'),'papers');
 assert.equal(occupationRejection({...base,migrant:true,naturalizedHere:true},'civil'),null);
 assert.equal(occupationRejection({...base,papersValid:false},'teacher'),'papers');
 assert.equal(occupationRejection({...base,recordLicensePenalty:1},'nurse'),'record');
 assert.equal(occupationRejection({...base,lateCareer:true},'soldier'),'restricted');
 assert.equal(occupationRejection({...base,rohingyaRefugee:true},'engineer'),'restricted');
 assert.equal(occupationRejection({...base,guestWorker:true},'teacher'),'restricted');
 assert.equal(occupationRejection({...base,drivingSuspended:true},'delivery'),'restricted');
 assert.equal(occupationRejection({...base,changingJobs:true,currentJob:'artisan'},'artisan'),'sameJob');
});

test('late legal exclusions do not reallocate sector mass while early exclusions do',()=>{
 const baseWeight=normalizeOccupationMarket(base,10,{teacher:1,civil:1});
 const foreign=normalizeOccupationMarket({...base,migrant:true},10,{teacher:1,civil:1});
 assert.equal(foreign.civil,undefined);assert.equal(foreign.teacher,baseWeight.teacher);
 const early=normalizeOccupationMarket({...base,blocked:['civil']},10,{teacher:1,civil:1});
 assert.ok(early.teacher!>baseWeight.teacher!);assert.equal(early.civil,undefined);
});
test('graduate agricultural reduction and market facts preserve original sector balancing',()=>{
 const plain=normalizeOccupationMarket(base,20,{farm:1});
 const agriculture=normalizeOccupationMarket({...base,major:'agr'},20,{farm:1});
 assert.ok(Math.abs(plain.farm!/agriculture.farm!-.06)<1e-12);
 assert.equal(occupationAvailability('pilot'),.0035);assert.equal(occupationAvailability('musician'),1);
 assert.equal(occupationFamily('engineer'),occupationFamily('dev'));
 assert.equal(occupationFamily('nurse'),occupationFamily('doctor'));
 assert.throws(()=>normalizeOccupationMarket({...base,region:'unknown'},20,{teacher:1}));
 assert.throws(()=>normalizeOccupationMarket(base,20,{teacher:NaN}));
});
const neutral={era:1,casteLand:1,herding:1,seafaring:1,arts:1,residence:1};
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
