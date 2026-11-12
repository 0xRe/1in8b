import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife, DEFAULT_SETTINGS, advanceYear, makeChoice } from '../src/game/engine';
import { playbackElapsed, stopsFastForward, setAutomaticChoices } from '../src/game/playback';

test('fast-forward consumes one bounded real-time slice rather than a whole life', () => {
  const life = createLife({...DEFAULT_SETTINGS, duration:30, country:'JPN', gentler:true, autoChoices:true}, 1);
  const elapsed = playbackElapsed(250, 30, 1, true);
  assert.equal(elapsed, 24 / 90);
  const next = advanceYear(life, elapsed);
  assert.equal(next.age, 1);
  assert.ok(next.alive);
  assert.equal(next.timeline!.position, elapsed);
  assert.equal(playbackElapsed(60000, 30, 1, true), elapsed, 'a delayed callback must not consume hidden/stalled time');
  assert.equal(playbackElapsed(250, 30, 1, false), 1 / 90);
});

test('a decision stops fast-forward even when the engine automatically answered it', () => {
  let before=createLife({...DEFAULT_SETTINGS,country:'JPN',gentler:true,autoChoices:true},1);
  before=advanceYear(before);
  const after=advanceYear(before);
  assert.ok(after.decisions.includes('temperament'));
  assert.equal(after.pendingDecision,null);
  assert.equal(stopsFastForward(before,after),true);
  const manual=createLife({...DEFAULT_SETTINGS,country:'JPN',gentler:true},1);
  const pending=advanceYear(advanceYear(manual));
  assert.equal(stopsFastForward(manual,pending),true);
  assert.equal(stopsFastForward(pending,makeChoice(pending,'curious')),true);
});

test('normal progress continues but bereavement, lost work, illness and endings stop acceleration', () => {
  const life=createLife({...DEFAULT_SETTINGS,country:'JPN',gentler:true},1);
  assert.equal(stopsFastForward(life,advanceYear(life,.01)),false);
  const lostParent=structuredClone(life);lostParent.family.parents[0].alive=false;
  assert.equal(stopsFastForward(life,lostParent),true);
  const working=structuredClone(life);working.stats.employment='employed';
  const unemployed=structuredClone(working);unemployed.stats.employment='unemployed';
  assert.equal(stopsFastForward(working,unemployed),true);
  const illness=structuredClone(life);illness.conditions.push('cancer');
  assert.equal(stopsFastForward(life,illness),true);
  const ended=structuredClone(life);ended.alive=false;
  assert.equal(stopsFastForward(life,ended),true);
});


test('turning off imported automatic choices restores manual decisions and survives save recovery', async () => {
  const { encodeSave, decodeSave } = await import('../src/game/storage');
  const original = createLife({...DEFAULT_SETTINGS,country:'JPN',gentler:true,autoChoices:true},1);
  const manual = setAutomaticChoices(original, false);
  assert.equal(original.settings.autoChoices, true);
  assert.equal(manual.settings.autoChoices, false);
  const restored = decodeSave(encodeSave(manual,[])).life!;
  const pending = advanceYear(advanceYear(restored));
  assert.equal(pending.pendingDecision?.id,'temperament');
  assert.equal(setAutomaticChoices(pending,false),pending);
  const automatic = setAutomaticChoices(restored,true);
  assert.equal(advanceYear(advanceYear(automatic)).pendingDecision,null);
});
