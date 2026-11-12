import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addUnlivedLife,
  clearUnlivedLives,
  getUnlivedLives,
  isStonesHidden,
  setStonesHidden,
  UNLIVED_STORAGE_KEY,
  UNLIVED_HIDDEN_KEY,
  MAX_UNLIVED,
} from '../src/lib/unlived';

// Mock localStorage for Node test environment
const mockStorage = new Map<string, string>();
const fakeLocalStorage = {
  getItem: (k: string) => mockStorage.get(k) ?? null,
  setItem: (k: string, v: string) => { mockStorage.set(k, String(v)); },
  removeItem: (k: string) => { mockStorage.delete(k); },
  clear: () => { mockStorage.clear(); },
};

(globalThis as any).window = globalThis;
(globalThis as any).localStorage = fakeLocalStorage;

test('unlived lives are stored, retrieved, and capped correctly', () => {
  clearUnlivedLives();
  assert.deepEqual(getUnlivedLives(), []);

  addUnlivedLife({ name: 'Maya', country: 'JPN', age: 24, kind: 'abandoned' });
  let lives = getUnlivedLives();
  assert.equal(lives.length, 1);
  assert.equal(lives[0].name, 'Maya');
  assert.equal(lives[0].country, 'JPN');
  assert.equal(lives[0].age, 24);
  assert.equal(lives[0].kind, 'abandoned');

  addUnlivedLife({ name: 'Infant Child', country: 'NGA', age: 1, kind: 'early_loss' });
  lives = getUnlivedLives();
  assert.equal(lives.length, 2);
  assert.equal(lives[0].name, 'Infant Child');
  assert.equal(lives[0].kind, 'early_loss');

  // Clear lives
  clearUnlivedLives();
  assert.deepEqual(getUnlivedLives(), []);
});

test('stones hidden preference can be toggled', () => {
  setStonesHidden(false);
  assert.equal(isStonesHidden(), false);

  setStonesHidden(true);
  assert.equal(isStonesHidden(), true);

  setStonesHidden(false);
  assert.equal(isStonesHidden(), false);
});
