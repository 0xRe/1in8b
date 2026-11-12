import test from 'node:test';import assert from 'node:assert/strict';
import {freeMovementZone} from '../src/game/free-movement';
test('EU transitions use both membership starts and the UK exit boundary',()=>{
 assert.equal(freeMovementZone('FRA','DEU',1967),null);
 assert.equal(freeMovementZone('FRA','DEU',1968),'eu');
 assert.equal(freeMovementZone('FRA','POL',2003),null);
 assert.equal(freeMovementZone('FRA','POL',2004),'eu');
 assert.equal(freeMovementZone('GBR','FRA',2020),'eu');
 assert.equal(freeMovementZone('GBR','FRA',2021),null);
});
test('an overlapping agreement remains available after another agreement ends',()=>{
 assert.equal(freeMovementZone('GBR','IRL',1922),null);
 assert.equal(freeMovementZone('GBR','IRL',1923),'cta');
 assert.equal(freeMovementZone('GBR','IRL',2021),'cta');
 assert.equal(freeMovementZone('IRL','GBR',2026),'cta');
});
test('regional agreements respect their own dates and are symmetric',()=>{
 for(const [a,b,year,zone] of [['AUS','NZL',1973,'tasman'],['IND','NPL',1950,'npl'],['IND','BTN',1949,'btn'],['BRA','ECU',2014,'mercosur'],['NGA','GHA',1980,'ecowas'],['JAM','TTO',2006,'csme']] as const){
  assert.equal(freeMovementZone(a,b,year-1),null);
  assert.equal(freeMovementZone(a,b,year),zone);assert.equal(freeMovementZone(b,a,year),zone);
 }
});
test('same-country, unknown and unrelated destinations never grant movement rights',()=>{
 for(const [a,b] of [['USA','USA'],['USA','CAN'],['XXX','FRA'],['DEU','JPN']])assert.equal(freeMovementZone(a,b,2026),null);
 assert.equal(freeMovementZone('FRA','DEU',NaN),null);
});
