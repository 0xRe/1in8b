import test from 'node:test';
import assert from 'node:assert/strict';
import {createLife,DEFAULT_SETTINGS} from '../src/game/engine';
import {createLearningState} from '../src/game/learning-state';
import {getCountryById} from '../src/game/countries';
import {collegeContext} from '../src/game/college-context';
const facts={kind:'ordinary' as const,job:'seeking' as const,retaking:false,vocationalTrack:false,accessModifiers:{},adhd:false,dyslexia:false,dyslexiaDiagnosed:false,unsupportedAutism:false,politicallyMarkedParent:false};
function applicant(){const l=createLife({...DEFAULT_SETTINGS,country:'JPN'},124);l.age=18;l.learning=createLearningState(18,{study:.8,body:0,art:0,music:0,hands:0,words:0},60);return l;}
test('college context uses birthplace access and current residence admission country without modifying the save',()=>{
 const l=applicant(),base=collegeContext(l,facts)!;l.country=getCountryById('FRA');const before=structuredClone(l),moved=collegeContext(l,facts)!;
 assert.equal(moved.country,'FRA');assert.equal(moved.birthCountry,'JPN');assert.equal(moved.conditionalTertiary,base.conditionalTertiary);assert.deepEqual(l,before);
 assert.ok(collegeContext(l,{...facts,accessModifiers:{universityEthnicityMultiplier:.2}})!.conditionalTertiary<base.conditionalTertiary);
 delete l.learning;assert.equal(collegeContext(l,facts),null);
});
test('college context composes original ADHD, dyslexia diagnosis and unsupported autism independently',()=>{
 const l=applicant();delete l.birthDevelopment; // Explicit legacy inputs remain authoritative when birth facts are unknown.
 assert.equal(collegeContext(l,{...facts,adhd:true,dyslexia:true})!.neurodevelopmentMultiplier,.76*(.4*.93));
 assert.equal(collegeContext(l,{...facts,dyslexia:true,dyslexiaDiagnosed:true})!.neurodevelopmentMultiplier,.4);
 const c=collegeContext(l,{...facts,unsupportedAutism:true})!;assert.equal(c.unsupportedAutism,true);assert.equal(c.neurodevelopmentMultiplier,1);
});
test('political parental penalty is limited to original historical Czech context and calendar boundary',()=>{
 const l=applicant();l.country=getCountryById('CZE');l.era='past';l.year=1989;
 assert.equal(collegeContext(l,{...facts,politicallyMarkedParent:true})!.eraMultiplier,.35);
 l.year=1990;assert.equal(collegeContext(l,{...facts,politicallyMarkedParent:true})!.eraMultiplier,1);
 l.year=1989;l.country=getCountryById('USA');assert.equal(collegeContext(l,{...facts,politicallyMarkedParent:true})!.eraMultiplier,1);
});
