import test from 'node:test';
import assert from 'node:assert/strict';
import {pensionEraCountry} from '../src/game/pension-era';
import {getCountryById} from '../src/game/countries';
import {pensionEraFactor} from '../src/game/pension-base';
import {pensionBaseAtYear} from '../src/game/pension-history';
test('pension fertility follows source annual series with modern normalization, rounding and year bounds',()=>{
 const jpn=getCountryById('JPN')!;
 assert.equal(pensionEraCountry(jpn,'past',1950).tfr,3.56);
 assert.equal(pensionEraCountry(jpn,'future',2100).tfr,1.45);
 assert.equal(pensionEraCountry(jpn,'future',2200).tfr,1.45);
 assert.equal(pensionEraCountry(jpn,'past',1800).tfr,3.56);
 assert.equal(pensionEraCountry(jpn,'today',1950).tfr,1.21);
 assert.equal(jpn.tfr,1.21);
});
test('future UK fertility crosses the pension reduction threshold instead of freezing modern fertility',()=>{
 const gbr=getCountryById('GBR')!,projected=pensionEraCountry(gbr,'future',2100);
 assert.equal(projected.tfr,1.63);
 assert.equal(pensionEraFactor(projected,2100,true),1);
 assert.equal(pensionEraFactor(gbr,2100,true),.75);
 const value=pensionBaseAtYear({country:gbr,birthCountry:'GBR',year:2100,formalYears:20,civilYears:0,income:100000,careerIncome:0,countries:{GBR:gbr}},[],20,'future',()=>{throw Error('no draw')});
 assert.equal(value,100000*.419*.6);
});
