import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileFocus, chooseStageFocus, type FocusSelection } from '../src/game/focus-model';
const work:FocusSelection={current:'work',picked:'work',returnTo:null,automaticFallback:null};
test('a temporarily unavailable manual work focus returns after reemployment',()=>{
 const fallback=reconcileFocus(work,['family','health','learn','hobby','rest'],false);
 assert.deepEqual(fallback,{current:'family',picked:null,returnTo:'work',automaticFallback:'family'});
 assert.deepEqual(reconcileFocus(fallback,['work','balance','family','health','learn','hobby'],false),work);
 assert.equal(work.current,'work');
});
test('an intervening manual choice cancels automatic restoration',()=>{
 const fallback=reconcileFocus(work,['family','health'],false);
 const chosen=chooseStageFocus(fallback,'health',['family','health']);
 assert.deepEqual(chosen,{current:'health',picked:'health',returnTo:null,automaticFallback:null});
 assert.deepEqual(reconcileFocus(chosen,['work','balance','health'],false),chosen);
 assert.equal(chooseStageFocus(chosen,'work',['family','health']),chosen);
});
test('education changes map study to learning and restore the original on returning to school',()=>{
 const study:FocusSelection={current:'study',picked:'study',returnTo:null,automaticFallback:null};
 const adult=reconcileFocus(study,['work','balance','family','health','learn','hobby'],false);
 assert.equal(adult.current,'learn');assert.equal(adult.picked,'learn');
 assert.deepEqual(reconcileFocus(adult,['study','play','help','sport','hobby'],false),study);
 assert.deepEqual(reconcileFocus(study,['family','health'],true),study);
});
test('infancy clears the active focus and a new stage defaults to balance or first choice',()=>{
 assert.equal(reconcileFocus(work,[],false).current,null);
 const empty:FocusSelection={current:null,picked:null,returnTo:null,automaticFallback:null};
 assert.equal(reconcileFocus(empty,['work','balance','family'],false).current,'balance');
 assert.equal(reconcileFocus(empty,['study','play'],false).current,'study');
});
