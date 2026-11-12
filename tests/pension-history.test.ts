import test from 'node:test';
import assert from 'node:assert/strict';
import {observedPensionHistory, pensionBaseFromObservedHistory} from '../src/game/pension-history';
import {createLife,DEFAULT_SETTINGS} from '../src/game/engine';
import {getCountryById} from '../src/game/countries';
const annual=createLife(DEFAULT_SETTINGS,1).history[0].annual!;
const row=(age:number,values:Record<string,unknown>={})=>({age,annual:{...annual,completed:true,personalIncome:100000.6,country:'USA',...values}});
test('pension history uses rounded personal earnings and prior completed adult years only',()=>{
 const result=observedPensionHistory([row(19),row(20),row(21,{country:'DEU',income:999999}),row(22,{completed:false})],22);
 assert.deepEqual(result,{complete:true,rows:[{age:20,country:'USA',income:100001},{age:21,country:'DEU',income:100001}],missingAges:[]});
});
test('unknown and missing adult years prevent a partial-history pension calculation',()=>{
 const result=observedPensionHistory([row(20,{personalIncome:undefined}),row(22,{completed:false}),{age:23,annual:null}],24);
 assert.equal(result.complete,false);
 assert.deepEqual(result.missingAges,[20,21,22,23]);
 const country=getCountryById('USA');let draws=0;
 const value=pensionBaseFromObservedHistory({country,birthCountry:'USA',year:2026,era:false,formalYears:20,civilYears:0,income:100000,careerIncome:0,countries:{USA:country}},[row(20,{personalIncome:undefined})],21,()=>{draws++;return .1});
 assert.equal(value,null);assert.equal(draws,0);
});
test('complete observed history feeds the real cross-border formula',()=>{
 const usa=getCountryById('USA'),deu=getCountryById('DEU');
 const value=pensionBaseFromObservedHistory({country:usa,birthCountry:'USA',year:2026,era:false,formalYears:20,civilYears:0,income:100000,careerIncome:0,countries:{USA:usa,DEU:deu}},[row(20,{personalIncome:100000}),row(21,{country:'DEU',personalIncome:100000})],22,()=>.1);
 assert.ok(Math.abs(value!-(100000*.391*.6/2+100000*.439/2))<1e-8);
});
