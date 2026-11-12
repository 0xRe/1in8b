import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { BirthInvitation } from '../src/components/BirthInvitation';

const html = (search?: string) => renderToString(createElement(BirthInvitation, { locale: 'en', onBegin: () => {}, disabled: true, search }));

test("a friend's invitation is in the server-rendered first paint", () => {
  const life = html('?born=ETH&life=21i3t5-85-1996-F-7-40-3&n=Fatou&via=quick');
  assert.match(life, /birth-invitation--life/);
  assert.match(life, /Fatou lived to 85 in Ethiopia/);
  assert.match(html('?born=JPN'), /class="birth-invitation"/);
});

test('without an invitation, or without a known URL, nothing is rendered on the server', () => {
  assert.equal(html(''), '');
  assert.equal(html(), '');
  assert.equal(html('?born=https://evil.example&n=<script>'), '');
});
