import test from 'node:test';
import assert from 'node:assert/strict';
import {guardianshipNeed,guardianshipChoices,planGuardianship,guardianshipExpense,guardianDeparture} from '../src/game/grandchild-guardianship';
const children=[{id:'a',alive:true,age:5,otherParent:false},{id:'b',alive:true,age:17,otherParent:true}];
const parent={alive:false,married:false,cohabited:false,divorced:false};
const player={age:78,health:35,imprisoned:false,residentialCare:false};
test('sole-parent loss requires minor guardianship; other family situations retain contact',()=>{
 assert.equal(guardianshipNeed(parent,children),'decision');
 assert.equal(guardianshipNeed({...parent,alive:true},children),'none');
 assert.equal(guardianshipNeed(parent,children.map(c=>({...c,age:18}))),'none');
 assert.equal(guardianshipNeed(parent,children.map(c=>({...c,alive:false}))),'none');
 for(const flag of ['married','cohabited','divorced'] as const)assert.equal(guardianshipNeed({...parent,[flag]:true},children),'otherParent');
 assert.equal(guardianshipNeed(parent,children.map(c=>({...c,otherParent:true}))),'otherParent');
});
test('home eligibility uses exact age health custody and residential-care gates without a cash gate',()=>{
 assert.deepEqual(guardianshipChoices(player),['home','kin','other']);
 for(const patch of [{age:79},{health:34},{imprisoned:true},{residentialCare:true}])assert.deepEqual(guardianshipChoices({...player,...patch}),['kin','other']);
 assert.deepEqual(guardianshipChoices({...player,age:40,health:100}),['home','kin','other']);
});
test('a care plan captures eligible siblings, source effects and fixed kin support through the youngest eighteenth birthday',()=>{
 const home=planGuardianship('home',player,children,2050)!;
 assert.deepEqual(home,{choice:'home',childIds:['a','b'],year:2050,effects:{happiness:-3,social:3,health:-2}});
 const kin=planGuardianship('kin',player,children,2050)!;
 assert.deepEqual(kin,{choice:'kin',childIds:['a','b'],year:2050,effects:{happiness:0,social:0,health:0},funding:{count:2,untilYear:2063}});
 assert.equal(planGuardianship('home',{...player,age:79},children,2050),null);
 assert.equal(planGuardianship('kin',player,[],2050),null);
 const other=planGuardianship('other',player,[...children,{id:'adult',age:18,alive:true,otherParent:false}],2050)!;
 assert.deepEqual(other.childIds,['a','b']);assert.equal(other.funding,undefined);
 assert.deepEqual(other.effects,{happiness:0,social:0,health:0});
 assert.deepEqual(children.map(c=>c.age),[5,17]);
});
test('home and kin expenses are separate; home ends at19, fixed kin group payment ends at its receipt boundary',()=>{
 const wards=[{alive:true,age:18},{alive:true,age:19},{alive:false,age:5}];
 assert.equal(guardianshipExpense(10000,wards,undefined,2060),1200);
 const funding={count:2,untilYear:2063};
 assert.equal(guardianshipExpense(10000,[],funding,2062),840);
 assert.equal(guardianshipExpense(10000,[],funding,2063),0);
 assert.equal(guardianshipExpense(10000,wards,funding,2062),2040);
});
test('home departure updates only living adult wards and awards the household milestone once',()=>{
 const wards=[{id:'a',alive:true,age:19},{id:'b',alive:true,age:18},{id:'c',alive:false,age:20}];
 assert.deepEqual(guardianDeparture(wards,false),{departed:['a'],announce:true,happiness:3});
 assert.deepEqual(guardianDeparture(wards,true),{departed:['a'],announce:false,happiness:0});
 assert.deepEqual(guardianDeparture(wards.slice(1),false),{departed:[],announce:false,happiness:0});
});
