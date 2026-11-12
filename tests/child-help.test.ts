import test from 'node:test';
import assert from 'node:assert/strict';
import {childHelpBond,heavyFamilyDebt,canRequestChildHelp,requestChildHelp} from '../src/game/child-help';
const parent={age:55,imprisoned:false,separated:false,median:10000,incomeFloor:5000,cash:0,investments:0,housing:0,rentalIncome:0,business:0,income:3000,lastAge:null as number|null};
const child={id:'one',alive:true,age:22,blocked:false,placed:false,median:10000,bond:0,gives:false,away:false,abroad:false,degreeJob:false,agriculture:false};
test('requested help uses net assets, debt pressure, age and a three-year cooldown',()=>{
 assert.equal(canRequestChildHelp(parent,[child]),true);
 for(const changes of [{age:54},{imprisoned:true},{separated:true},{lastAge:53},{lastAge:56},{cash:40000}])assert.equal(canRequestChildHelp({...parent,...changes},[child]),false);
 assert.equal(canRequestChildHelp({...parent,lastAge:52},[child]),true);
 assert.equal(canRequestChildHelp(parent,[{...child,placed:true}]),false);
 assert.equal(canRequestChildHelp(parent,[{...child,age:21}]),false);
 assert.equal(heavyFamilyDebt({...parent,cash:-1000,housing:100000}),false);
 assert.equal(heavyFamilyDebt({...parent,cash:-40000,housing:100000}),true);
 assert.equal(canRequestChildHelp({...parent,cash:-40000,housing:100000},[child]),true);
});
test('help settles at most five acceptance draws with distress and occupation factors, without mutating inputs',()=>{
 const children=[{...child,alive:false},...Array.from({length:6},(_,i)=>({...child,id:String(i)}))];let draws=0;
 const result=requestChildHelp(parent,children,()=>{draws++;return .59;});
 assert.equal(draws,5);assert.equal(result.amount,3900);assert.equal(result.accepted.length,5);assert.equal(result.happiness,2);assert.equal(result.social,1);
 assert.equal(children[1].bond,0);
 const rich={...parent,cash:90000};
 assert.equal(requestChildHelp(rich,[child],()=>.11).accepted.length,0);
 const boosted={...child,degreeJob:true,abroad:true,gives:true};
 assert.equal(requestChildHelp(parent,[boosted],()=>.69).amount,1690);
 assert.equal(requestChildHelp(parent,[{...child,agriculture:true}],()=>0).amount,520);
 const refused=requestChildHelp(parent,[child],()=>.99);assert.equal(refused.amount,0);assert.equal(refused.happiness,-2);assert.equal(refused.social,0);
});
test('child bond includes social, family focus, observed bond and source special-state modifiers',()=>{
 const base={name:'',identityName:'',age:22,social:61,familyWeight:0,bond:0,temporaryBond:0,shame:0,abroad:false,withParent:false,returned:false,estranged:false};
 assert.equal(childHelpBond(base),10);
 assert.equal(childHelpBond({...base,social:71,familyWeight:.5,bond:3,temporaryBond:30,shame:1,abroad:true,withParent:true,returned:true,estranged:true}),15);
 assert.equal(childHelpBond({...base,age:7}),30);
 assert.equal(childHelpBond({...base,age:10}),6);
});
