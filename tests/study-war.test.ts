import test from 'node:test';import assert from 'node:assert/strict';
import {studyWarAt} from '../src/game/study-war';
import {getCountryById} from '../src/game/countries';
import {studyDestinationOpen} from '../src/game/study-destinations';
test('historical wars use inclusive years rather than present-day country risk',()=>{
 assert.equal(studyWarAt('KOR',1950),5);assert.equal(studyWarAt('KOR',1953),5);assert.equal(studyWarAt('KOR',1954),0);
 assert.equal(studyWarAt('KHM',1975),3);assert.equal(studyWarAt('KHM',1974.6),3);
 assert.equal(studyWarAt('AFG',1989),3);assert.equal(studyWarAt('AFG',1990),2);assert.equal(studyWarAt('AFG',2002),1.2);assert.equal(studyWarAt('AFG',2022),0);
});
test('future study risk follows the reference seven-year half-life and one-decimal rounding',()=>{
 const current=getCountryById('AFG')!.war;
 assert.equal(studyWarAt('AFG',2026),Math.round(current*10)/10);
 assert.equal(studyWarAt('AFG',2033),Math.round(current*.5*10)/10);
 assert.equal(studyWarAt('DEU',2040),0);
 assert.equal(studyWarAt('KOR',1900),studyWarAt('KOR',1950));
});
test('unresolved countries and invalid years do not masquerade as peaceful destinations',()=>{
 assert.equal(studyWarAt('XXX',2026),Infinity);assert.equal(studyWarAt('DEU',NaN),Infinity);
});
test('destination eligibility resolves historical war when no override is supplied',()=>{
 const c={origin:'JPN',birthCountry:'JPN',year:2001,muslim:false};
 assert.equal(studyDestinationOpen(c,'AFG'),false);
 assert.equal(studyDestinationOpen({...c,year:2022},'AFG'),true);
 assert.equal(studyDestinationOpen({...c,warAt:()=>1},'DEU'),false);
});
