import assert from 'node:assert/strict';
import test from 'node:test';
import { readSessionPreference } from '../src/lib/session-preferences';

test('blocked session storage does not prevent save recovery', () => {
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, get() { throw new DOMException('Denied', 'SecurityError'); } });
  assert.equal(readSessionPreference('1in8bn-view'), null);
});
