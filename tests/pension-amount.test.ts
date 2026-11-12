import test from 'node:test';
import assert from 'node:assert/strict';
import {pensionAmountAtYear} from '../src/game/pension-history';
import {getCountryById} from '../src/game/countries';
import {createLife,DEFAULT_SETTINGS} from '../src/game/engine';
import {prepareMilitaryRetirement,resolveMilitaryRetirement,type MilitaryRetirementContext} from '../src/game/military-retirement';
const usa=getCountryById('USA')!;
const context={country:usa,birthCountry:'USA',year:2026,formalYears:40,civilYears:0,income:100000,careerIncome:0,countries:{USA:usa}};
const annual=createLife(DEFAULT_SETTINGS,1).history[0].annual!;
const history=Array.from({length:40},(_,i)=>({age:20+i,annual:{...annual,completed:true,personalIncome:100000,country:'USA'}}));
const military={years:22,lastIncome:100000,lastCountry:'USA',existing:null};
test('complete retirement amount adds only civilian service share to military entitlement',()=>{
 const value=pensionAmountAtYear(context,history,60,'today',military,()=>{throw Error('no draw')});
 assert.equal(value,35600+39100*18/40);
 assert.equal(pensionAmountAtYear({...context,formalYears:22},history,60,'today',military,()=>0),35600);
 assert.equal(pensionAmountAtYear(context,history,60,'today',{...military,lastCountry:'JPN'},()=>0),39100);
 assert.equal(pensionAmountAtYear(context,history,60,'today',{...military,lastCountry:'JPN',existing:{value:50000,startedAge:55}},()=>0),50000+39100*18/40);
});
test('unknown history never produces a misleading military-only total or consumes ordinary eligibility draws',()=>{
 let draws=0;
 assert.equal(pensionAmountAtYear(context,history.slice(1),60,'today',military,()=>{draws++;return .1}),null);
 assert.equal(draws,0);
});
test('mandatory retirement preview and acceptance can use the full composed pension calculation',()=>{
 const retirement={age:60,rank:2 as const,commissioned:true,working:true,retired:false,handledAge:null,income:100000,percentile:.8,careerIncome:0,careerPercentile:null};
 const calculate=(state:MilitaryRetirementContext)=>pensionAmountAtYear({...context,income:state.income,careerIncome:state.careerIncome},history,state.age,'today',military,()=>0)!;
 const offer=prepareMilitaryRetirement(retirement,calculate)!;
 const result=resolveMilitaryRetirement(retirement,offer,'retire',calculate)!;
 assert.equal(offer.pensionPreview,53195);assert.equal(result.pension,53195);
});
