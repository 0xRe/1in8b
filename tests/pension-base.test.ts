import test from 'node:test';import assert from 'node:assert/strict';
import {ordinaryPensionBase,pensionReplacementRate,pensionYearFactor,pensionEraFactor,civilServicePensionRate} from '../src/game/pension-base';
import {getCountryById} from '../src/game/countries';
const usa=getCountryById('USA');const c={country:usa,birthCountry:'USA',year:2026,era:false,formalYears:20,civilYears:0,income:100000,careerIncome:0,history:[],countries:{USA:usa}};
test('pension replacement and service factors preserve source floors and era changes',()=>{
 assert.equal(pensionReplacementRate(usa),.391);assert.equal(pensionYearFactor(20),.6);assert.equal(pensionYearFactor(40),1);
 assert.equal(pensionEraFactor({...usa,tfr:1.5},2070,true),.75);assert.equal(pensionEraFactor(getCountryById('KOR'),1990,true),.15);
 assert.equal(ordinaryPensionBase(c,()=>{throw Error('unexpected draw')}),100000*.391*.6);
});
test('Latin-American eligibility lottery is consumed only without sufficient formal service',()=>{
 const country=getCountryById('BRA');let draws=0;const draw=()=>{draws++;return .9};
 assert.equal(ordinaryPensionBase({...c,country,birthCountry:'BRA',formalYears:9},draw),0);assert.equal(draws,1);
 assert.ok(ordinaryPensionBase({...c,country,formalYears:10},draw)>0);assert.equal(draws,1);
});
test('Korean and Chinese civil-service pensions honor birth country and transition years',()=>{
 const kor=getCountryById('KOR'),chn=getCountryById('CHN');
 assert.equal(civilServicePensionRate({...c,country:kor,birthCountry:'USA',civilYears:30}),0);
 assert.equal(civilServicePensionRate({...c,country:kor,birthCountry:'KOR',year:2009,civilYears:20}),.5);
 assert.equal(civilServicePensionRate({...c,country:kor,birthCountry:'KOR',year:2015,civilYears:20}),.019*20);
 assert.equal(civilServicePensionRate({...c,country:chn,birthCountry:'CHN',year:2024,civilYears:20}),.8);
});
test('cross-border pension uses qualifying adult work rows and excludes non-paying foreign regions',()=>{
 const deu=getCountryById('DEU'),ind=getCountryById('IND');
 const result=ordinaryPensionBase({...c,countries:{USA:usa,DEU:deu,IND:ind},history:[{age:30,country:'USA',income:100000},{age:31,country:'DEU',income:100000},{age:32,country:'IND',income:100000},{age:19,country:'DEU',income:100000},{age:33,country:'DEU',income:1}]},()=>.1);
 assert.ok(Math.abs(result-(100000*.391*.6/3+100000*.439/3))<1e-8);
});
