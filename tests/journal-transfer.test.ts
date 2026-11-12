import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceYear, createLife, DEFAULT_SETTINGS, makeChoice } from '../src/game/engine';
import { recordChoice } from '../src/lib/game-feedback';
import { exportBackup, importBackup } from '../src/lib/transfer';

function chosenLife() {
  let life = createLife({...DEFAULT_SETTINGS,autoChoices:false}, 4);
  while (life.alive && !life.pendingDecision) life = advanceYear(life);
  assert.ok(life.pendingDecision);
  const choice = life.pendingDecision.choices[0], after = makeChoice(life, choice.id);
  recordChoice(life, after, choice);
  return after;
}
function storage() {
  const values = new Map<string,string>();
  Object.defineProperty(globalThis,'localStorage',{configurable:true,writable:true,value:{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)}});
  return values;
}
test('backup restores choice annotations after the local record and its metadata are deleted', () => {
  const values = storage(), life = chosenLife(), key = `1in8bn-choices-${life.id}`, original = JSON.parse(values.get(key)!);
  assert.equal(original.length,1);
  const backup = exportBackup(life,[]);
  values.clear();
  const restored = importBackup(backup);
  for (const [key,value] of restored.metadata) values.set(key,value);
  assert.deepEqual(JSON.parse(values.get(key)!), original);
});
test('import bounds journals to real decision events and scalar annotations; legacy backups remain supported', () => {
  const values = storage(), life = chosenLife(), key = `1in8bn-choices-${life.id}`, entry = JSON.parse(values.get(key)!)[0];
  const raw = JSON.parse(exportBackup(life,[]));
  raw.journals = {[life.id]:[entry, {...entry,eventId:'other-life'}, {...entry,age:-1}, {...entry,choiceParams:{payload:{html:'bad'}}}], 'unknown-life':[entry]};
  const restored = importBackup(JSON.stringify(raw)), journal = restored.metadata.find(([k])=>k===key);
  assert.ok(journal);
  assert.deepEqual(JSON.parse(journal[1]), [entry]);
  assert.ok(restored.metadata.every(([k])=>!k.includes('unknown-life')));
  delete raw.journals;
  assert.ok(!importBackup(JSON.stringify(raw)).metadata.some(([k])=>k===key));
});
