import test from 'node:test';
import assert from 'node:assert/strict';
import {childBoard,type BoardChild} from '../src/game/child-board';
const parent={age:59,retired:false,region:'hi',medianIncome:10000,year:2050};
const child:BoardChild={id:'one',alive:true,age:20,home:true,abroad:false,away:false,placed:false,working:true,university:false,withdrawn:false};
test('young working co-resident children decide once and pay median-based board, not a wage fraction',()=>{
 const first=childBoard(parent,[child],()=>.49);
 assert.deepEqual(first,{observations:[{id:'one',receipt:{year:2050,willing:true}}],payments:[{id:'one',amount:150}]});
 const again=childBoard({...parent,year:2051},[{...child,receipt:first.observations[0].receipt}],()=>{throw Error('rerolled');});
 assert.deepEqual(again,{observations:[],payments:[{id:'one',amount:150}]});
 assert.deepEqual(childBoard(parent,[{...child,receipt:{year:2049,willing:false}}],()=>{throw Error('rerolled refusal');}),{observations:[],payments:[]});
 assert.equal(childBoard({...parent,region:'sa'},[child],()=>.69).payments[0].amount,250);
 assert.equal(childBoard(parent,[child],()=>.5).payments.length,0);
 assert.equal(childBoard({...parent,region:'sa'},[child],()=>.7).payments.length,0);
});
test('board draws only eligible children before retirement and caps payments at two without skipping later decisions',()=>{
 const noDraw=()=>{throw Error('ineligible draw');};
 for(const changes of [{age:60},{retired:true}])assert.deepEqual(childBoard({...parent,...changes},[child],noDraw),{observations:[],payments:[]});
 for(const changes of [{alive:false},{age:19},{home:false},{abroad:true},{away:true},{placed:true},{working:false},{university:true},{withdrawn:true}])assert.deepEqual(childBoard(parent,[{...child,...changes}],noDraw),{observations:[],payments:[]});
 let draws=0;
 const result=childBoard(parent,Array.from({length:4},(_,i)=>({...child,id:String(i)})),()=>{draws++;return .1;});
 assert.equal(draws,4);assert.equal(result.observations.length,4);assert.deepEqual(result.payments,[{id:'0',amount:150},{id:'1',amount:150}]);
 assert.equal(childBoard(parent,[{...child,age:23,university:true}],()=>.1).payments.length,1);
});
