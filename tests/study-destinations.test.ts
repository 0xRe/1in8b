import test from 'node:test';import assert from 'node:assert/strict';
import {eligibleStudyDestinations,studyDestinationOpen} from '../src/game/study-destinations';
const context={origin:'JPN',birthCountry:'JPN',year:2026,muslim:false,warAt:()=>0};
test('destination access excludes home, unknown, closed years and conflict threshold',()=>{
 assert.equal(studyDestinationOpen(context,'JPN'),false);assert.equal(studyDestinationOpen(context,'BAD'),false);
 assert.equal(studyDestinationOpen({...context,year:1994},'KOR'),false);assert.equal(studyDestinationOpen({...context,year:1995},'KOR'),true);
 assert.equal(studyDestinationOpen({...context,warAt:()=>.2},'DEU'),false);assert.equal(studyDestinationOpen({...context,warAt:()=>.19},'DEU'),true);
 assert.equal(studyDestinationOpen({...context,origin:'PRK',birthCountry:'PRK'},'DEU'),false);
});
test('source simulation year restrictions and bilateral conflict gates apply',()=>{
 assert.equal(studyDestinationOpen({...context,origin:'NGA',birthCountry:'NGA',year:2025},'USA'),true);
 assert.equal(studyDestinationOpen({...context,origin:'NGA',birthCountry:'NGA',year:2026},'USA'),false);
 assert.equal(studyDestinationOpen({...context,origin:'UKR',birthCountry:'UKR',year:2021},'RUS'),true);
 assert.equal(studyDestinationOpen({...context,origin:'UKR',birthCountry:'UKR',year:2022},'RUS'),false);
 assert.equal(studyDestinationOpen(context,'UKR'),false);
});
test('country-specific weights and admission policy are separate modifiers',()=>{
 const options=eligibleStudyDestinations(context);const us=options.find(o=>o.country==='USA')!,can=options.find(o=>o.country==='CAN')!;
 assert.equal(us.weight,33.6);assert.equal(us.policyFactor,.85);assert.equal(us.admissionFactor,.85);
 assert.equal(can.weight,4.05);assert.equal(can.policyFactor,.8);assert.equal(options.find(o=>o.country==='DEU')!.scholarshipProbability,.06);
});
test('a blocked preferred table falls back to eligible high-income destinations',()=>{
 const options=eligibleStudyDestinations({...context,origin:'SUR',birthCountry:'SUR',warAt:(id:string)=>['NLD','USA','BEL'].includes(id)?1:0});
 assert.ok(options.some(o=>o.country==='GBR'));assert.ok(options.every(o=>!['NLD','USA','BEL'].includes(o.country)));
});
