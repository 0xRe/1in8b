import test from 'node:test';
import assert from 'node:assert/strict';
import { duoInvitationShare } from '../src/lib/duo-invitation';
test('private invitation has an inviter message while its name stays out of the URL',()=>{
 const invite=duoInvitationShare('Ari & Robin','https://1in8bn.com','private-room','a'.repeat(64));
 assert.match(invite.text,/Ari & Robin invited you/);assert.ok(invite.copyText.includes(invite.url));
 const url=new URL(invite.url);assert.equal(url.searchParams.get('room'),'private-room');assert.equal(new URLSearchParams(url.hash.slice(1)).get('invite'),'a'.repeat(64));
 assert.ok(!invite.url.includes('Ari'));assert.equal(url.searchParams.get('n'),null);
});

test('localized invitations retain the language and keep the capability in the fragment', () => {
  const invitation = duoInvitationShare('QA', 'https://1in8bn.com', 'room-id', 'secret', 'zh-hans');
  const url = new URL(invitation.url);
  assert.equal(url.pathname, '/zh-hans/together/');
  assert.equal(url.search, '?room=room-id');
  assert.equal(url.hash, '#invite=secret');
});
