import test from 'node:test';
import assert from 'node:assert/strict';
import {createLife,advanceYear,DEFAULT_SETTINGS} from '../src/game/engine';
import {encodeSave,decodeSave} from '../src/game/storage';

test('versioned job preparation remains distinct from legacy work-intensity records',()=>{
 const life=advanceYear(createLife({...DEFAULT_SETTINGS,country:'JPN',gentler:true},1));
 life.focus='career';
 life.history.at(-1)!.annual!.focus='career';
 life.history.at(-1)!.annual!.focusWeights={career:1};
 life.stageFocus={version:1,selection:{current:'careerPrep',picked:'careerPrep',returnTo:null,automaticFallback:null}};
 const restored=decodeSave(encodeSave(life,[])).life!;
 assert.equal(restored.stageFocus!.selection.current,'careerPrep');
 assert.equal(restored.focus,'career');
 assert.deepEqual(restored.history,life.history);
});

test('unknown focus IDs and versions are rejected without inventing state in legacy saves',()=>{
 const life=createLife(DEFAULT_SETTINGS,1);
 assert.equal(decodeSave(encodeSave(life,[])).life!.stageFocus,undefined);
 const selection={current:'study',picked:'study',returnTo:null,automaticFallback:null};
 for(const stageFocus of [null,{}, {version:2,selection},{version:1,selection:{...selection,current:'career'}},{version:1,selection:{...selection,returnTo:42}},{version:1,selection:{current:'study'}},{version:1,selection:[]}])
  assert.throws(()=>decodeSave(JSON.stringify({version:1,life:{...life,stageFocus},past:[]})));
});
