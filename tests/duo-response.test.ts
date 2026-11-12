import test from 'node:test';
import assert from 'node:assert/strict';
import { createFullDuoState, duoSnapshot } from '../src/lib/duo-engine';
import { readDuoApiResponse, DuoRequestError } from '../src/lib/duo-response';

test('room failures keep actionable classifications without exposing server response details', async () => {
  for (const [status, reason, expected] of [
    [403, 'invitation_used', 'invitation_used'],
    [409, undefined, 'stale_state'],
    [503, undefined, 'server_error'],
    [400, undefined, 'request_rejected'],
    ...['stale_life', 'stale_clock', 'decision_pending', 'action_unavailable'].map(reason => [409, reason, reason]),
  ] as const) {
    await assert.rejects(readDuoApiResponse(Response.json({reason, error:'PRIVATE_RAW_SERVER_DETAIL'}, {status:Number(status)}), 'snapshot'), error => {
      assert.ok(error instanceof DuoRequestError);
      assert.equal(error.status, status);
      assert.equal(error.classification, expected);
      assert.ok(!error.message.includes('PRIVATE_RAW_SERVER_DETAIL'));
      return true;
    });
  }
});

test('room response validation rejects malformed success envelopes and invalid JSON', async () => {
  for (const response of [new Response('<html>unavailable</html>', {status:502}), new Response('broken'), Response.json([]), Response.json({snapshot:null}), Response.json({phase:'planning',self:{}})]) {
    await assert.rejects(readDuoApiResponse(response, 'snapshot'), DuoRequestError);
  }
});

test('valid room envelopes and conditional heartbeats preserve client recovery', async () => {
  const now=Date.now(), state=createFullDuoState('room', 'Alex', 'actor', 'hash', 'invite', now), snapshot=duoSnapshot(state,'actor',now);
  for (const kind of ['snapshot','admission','invitation','preview'] as const) {
    const body=kind==='snapshot'?snapshot:kind==='preview'?{inviterName:'Alex'}:{snapshot,credential:'member-key',inviteSecret:'invitation'};
    assert.deepEqual(await readDuoApiResponse(Response.json(body),kind),JSON.parse(JSON.stringify(body)));
  }
  for (const status of [204,304]) assert.equal(await readDuoApiResponse(new Response(null,{status}),'snapshot',{}),null);
  await assert.rejects(readDuoApiResponse(new Response(null,{status:204}),'admission'),DuoRequestError);
});
