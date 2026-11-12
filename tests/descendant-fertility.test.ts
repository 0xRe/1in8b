import assert from 'node:assert/strict';
import test from 'node:test';
import { getCountryById } from '../src/game/countries';
import { fertilityAt, laterBirthAge, fertilityTarget } from '../src/game/descendant-fertility';
const country = (id: string) => getCountryById(id)!;
test('later generations use country and sex birth windows rather than an adulthood-only gate', () => {
 assert.equal(laterBirthAge(country('KOR'), 'F'),31.5);
 assert.equal(laterBirthAge(country('KOR'), 'M'),34.5);
 assert.equal(laterBirthAge(country('JPN'), 'F'),29.7);
 assert.equal(laterBirthAge(country('CHN'), 'F'),28);
 assert.equal(laterBirthAge(country('PHL'), 'F'),24.75);
 assert.equal(laterBirthAge({...country('NGA'),cm:100,tfr:6},'F'),16.5);
 assert.equal(laterBirthAge(country('KOR'),'F',1990),26.4);
 assert.equal(laterBirthAge(country('KOR'),'F',2026),31.5);
});
test('future fertility converges without crossing its demographic endpoint', () => {
 assert.equal(fertilityAt(4,2025),4);
 assert.equal(fertilityAt(4,1980),4);
 assert.ok(Math.abs(fertilityAt(4,2070)-(1.9+2.1/Math.E))<1e-10);
 assert.ok(Math.abs(fertilityAt(1,2075)-(1.5-.5/Math.E))<1e-10);
 assert.equal(fertilityAt(1.7,2100),1.7);
});
test('fertility can be zero and its nonzero sampled target stays bounded at nine', () => {
 assert.equal(fertilityTarget(country('USA'),2,()=>.16),0);
 assert.equal(fertilityTarget(country('NGA'),2,()=>.06),0);
 const samples=[.5,.01];
 assert.equal(fertilityTarget(country('NGA'),2,()=>samples.shift()??.01),1);
 assert.equal(fertilityTarget(country('NGA'),9,()=>.999),9);
});
