import assert from 'node:assert/strict';
import test from 'node:test';
import { unionAvailability, drawChildOrientation, sameSexParentMethod } from '../src/game/child-union';
const draws=(...values:number[])=>()=>{assert.ok(values.length,'unexpected random draw');return values.shift()!;};
test('reference country/year thresholds preserve unavailable, partnership and marriage precedence',()=>{
 assert.equal(unionAvailability('NLD',2000),'partnership');assert.equal(unionAvailability('NLD',2001),'marriage');
 assert.equal(unionAvailability('USA',2014),'neither');assert.equal(unionAvailability('USA',2015),'marriage');
 assert.equal(unionAvailability('IND',2017),null);assert.equal(unionAvailability('IND',2018),'neither');
 assert.equal(unionAvailability('JPN',1999),null);assert.equal(unionAvailability('JPN',2000),'neither');
 assert.equal(unionAvailability('NGA',2100),null);
});
test('orientation uses sequential draws and keeps bisexual identity separate from partner sex',()=>{
 assert.deepEqual(drawChildOrientation('F','marriage',draws(.01)),{orientation:'sameSex',sameSexPartner:true});
 assert.deepEqual(drawChildOrientation('F','marriage',draws(.5,.038,.12)),{orientation:'bisexual',sameSexPartner:true});
 assert.deepEqual(drawChildOrientation('M','marriage',draws(.5,.02,.2)),{orientation:'bisexual',sameSexPartner:false});
 assert.deepEqual(drawChildOrientation('M','marriage',draws(.5,.025)),{orientation:'oppositeSex',sameSexPartner:false});
 assert.deepEqual(drawChildOrientation('F',null,draws()),{orientation:'oppositeSex',sameSexPartner:false});
});
test('parent formation uses residence context, year gates, sex and income',()=>{
 assert.equal(sameSexParentMethod({id:'USA',ppp:50000},2014,'M',draws()),'surrogacy');
 assert.equal(sameSexParentMethod({id:'USA',ppp:50000},2015,'M',draws(.35)),'adoption');
 assert.equal(sameSexParentMethod({id:'GBR',ppp:50000},2009,'M',draws()),null);
 assert.equal(sameSexParentMethod({id:'GBR',ppp:50000},2009,'F',draws()),'donor');
 assert.equal(sameSexParentMethod({id:'GBR',ppp:14999},2009,'F',draws()),null);
 assert.equal(sameSexParentMethod({id:'USA',ppp:50000},2026,'F',draws(.7)),'adoption');
 assert.equal(sameSexParentMethod({id:'ZAF',ppp:14000},2026,'F',draws()),'adoption');
 assert.equal(sameSexParentMethod({id:'JPN',ppp:50000},2026,'F',draws()),null);
});
