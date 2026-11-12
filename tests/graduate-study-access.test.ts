import test from 'node:test';import assert from 'node:assert/strict';
import {createNewGame} from '../src/game/new-game';import {DEFAULT_SETTINGS} from '../src/game/engine';
import {graduateStudyAccess} from '../src/game/graduate-study-access';
function life(country='JPN'){return createNewGame({...DEFAULT_SETTINGS,country},1);}
test('graduate funding distinguishes family access from sufficient personal savings',()=>{
 const l=life();l.stats.incomeQuintile=3;l.stats.savings=0;assert.equal(graduateStudyAccess(l)?.eligible,true);assert.equal(graduateStudyAccess(l)?.selfFunded,false);
 l.stats.incomeQuintile=2;assert.equal(graduateStudyAccess(l)?.eligible,false);
 l.stats.savings=graduateStudyAccess(l)!.cost;assert.equal(graduateStudyAccess(l)?.eligible,true);assert.equal(graduateStudyAccess(l)?.selfFunded,true);
 l.stats.savings-=1;assert.equal(graduateStudyAccess(l)?.eligible,false);
});
test('graduate route respects registered birth, prior migration and source excluded home countries',()=>{
 for(const country of ['PRK','USA','GBR','CAN','AUS'])assert.equal(graduateStudyAccess(life(country))?.eligible,false);
 const l=life();l.academics!.upperFacts!.unregisteredBirth=true;assert.equal(graduateStudyAccess(l)?.eligible,false);
 l.academics!.upperFacts!.unregisteredBirth=false;l.migration.moves.push({age:0,country:'DEU',together:false});assert.equal(graduateStudyAccess(l)?.eligible,false);
 delete l.academics!.upperFacts;assert.equal(graduateStudyAccess(l),null);
});
