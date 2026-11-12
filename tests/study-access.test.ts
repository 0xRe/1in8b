import test from 'node:test';import assert from 'node:assert/strict';
import {createNewGame} from '../src/game/new-game';
import {createLife,DEFAULT_SETTINGS} from '../src/game/engine';
import {studyAccess} from '../src/game/study-access';
import {decodeSave,encodeSave} from '../src/game/storage';
function life(country='JPN',year=2026){const l=createNewGame({...DEFAULT_SETTINGS,country},1);l.year=year;l.era=year<2026?'past':'today';return l;}
test('only generated observed access facts establish eligibility; legacy remains unknown',()=>{
 const fresh=life();assert.ok(studyAccess(fresh)?.freeExit);assert.ok(studyAccess(fresh)?.papersValid);
 assert.deepEqual(studyAccess(decodeSave(encodeSave(fresh,[])).life!),studyAccess(fresh));
 const legacy=createLife(DEFAULT_SETTINGS,1);assert.equal(studyAccess(legacy),null);
 delete fresh.academics!.studyAccess;assert.equal(studyAccess(fresh),null);
});
test('historical closure spans and East German facts change exit rights at exact boundaries',()=>{
 for(const [country,lastClosed] of [['RUS',1990],['POL',1989],['CHN',1978],['VNM',1988],['KHM',1991],['CUB',1994],['MMR',1988]] as const){
  assert.equal(studyAccess(life(country,lastClosed))?.freeExit,false);
  assert.equal(studyAccess(life(country,lastClosed+1))?.freeExit,true);
 }
 const east=life('DEU',1989);east.academics!.studyAccess!.eastGerman=true;assert.equal(studyAccess(east)?.freeExit,false);east.year=1990;assert.equal(studyAccess(east)?.freeExit,true);
 assert.equal(studyAccess(life('PRK'))?.freeExit,false);
});
test('personal restrictions depend on explicit identity, dates and naturalization',()=>{
 const l=life('CHN',2025);l.academics!.studyAccess!.ethnicity='uyghur';assert.equal(studyAccess(l)?.freeExit,false);
 l.year=2026;assert.equal(studyAccess(l)?.freeExit,true);
 const roh=life('MMR');roh.academics!.studyAccess!.ethnicity='rohingya';assert.equal(studyAccess(roh)?.freeExit,false);
 roh.academics!.studyAccess!.naturalized=true;assert.equal(studyAccess(roh)?.freeExit,true);
 roh.academics!.upperFacts!.unregisteredBirth=true;assert.equal(studyAccess(roh)?.papersValid,false);
});
test('family funding follows wealth and country PPP without assuming a low-quintile scholarship',()=>{
 const l=life('JPN');l.stats.incomeQuintile=3;l.academics!.primaryFacts!.rich=false;
 assert.equal(studyAccess(l)?.familyAbroad,false);assert.ok(studyAccess(l)!.abroadCost>30000);
 l.academics!.primaryFacts!.rich=true;assert.equal(studyAccess(l)?.familyAbroad,true);
 const low=life('IND');low.stats.incomeQuintile=4;low.academics!.primaryFacts!.rich=false;assert.equal(studyAccess(low)?.familyAbroad,true);
});

test('imported access facts must use explicit supported identities and boolean status fields',()=>{
 for(const key of ['ethnicity','naturalized','eastGerman','recentlyFled']){
  const l=life();(l.academics!.studyAccess as unknown as Record<string,unknown>)[key]=key==='ethnicity'?'inferred-from-country':'yes';
  assert.throws(()=>decodeSave(encodeSave(l,[])));
 }
});
