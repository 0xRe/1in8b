import test from 'node:test';
import assert from 'node:assert/strict';
import { startDuoPolling } from '../src/lib/duo-client-lifecycle';

function fixture() {
  let hidden = false, voice = false, time = 0, requests = 0, failures = 0;
  let release: (() => void) | undefined;
  const timers = new Map<number, () => void>(); let nextTimer = 0;
  let lastSignal: AbortSignal | undefined;
  const poller = startDuoPolling({
    request: signal => { requests++; lastSignal = signal; return new Promise<void>(resolve => { release = resolve; }); },
    failure: () => { failures++; }, isHidden: () => hidden, isVoiceActive: () => voice, now: () => time,
    schedule: callback => { timers.set(++nextTimer, callback); return nextTimer as unknown as ReturnType<typeof setTimeout>; },
    cancel: id => { timers.delete(id as unknown as number); },
  });
  return { poller, timers, get requests() { return requests; }, get failures() { return failures; }, get signal() { return lastSignal; }, finish: async () => { release?.(); await Promise.resolve(); await Promise.resolve(); }, tick: () => { const pending = [...timers.values()]; timers.clear(); pending.forEach(run => run()); }, hide: () => { hidden = true; poller.wake(); }, show: () => { hidden = false; poller.wake(); }, voice: () => { voice = true; }, age: () => { time += 30_000; } };
}
test('wake while polling coalesces and never overlaps, stop aborts and clears timers', async () => {
  const f = fixture(); f.poller.wake(); f.poller.wake(); assert.equal(f.requests, 1);
  await f.finish(); assert.equal(f.timers.size, 1); f.tick(); assert.equal(f.requests, 2);
  f.poller.stop(); assert.equal(f.signal?.aborted, true); await f.finish(); assert.equal(f.timers.size, 0);
});
test('hidden idle tabs become stale and foreground wakes immediately', async () => {
  const f = fixture(); f.hide(); await f.finish(); f.age(); f.tick(); assert.equal(f.requests, 1);
  f.show(); assert.equal(f.requests, 2); f.poller.stop(); await f.finish();
});
test('active voice keeps paced hidden heartbeats alive beyond idle staleness', async () => {
  const f = fixture(); f.voice(); f.hide(); await f.finish(); f.age(); f.tick(); assert.equal(f.requests, 2);
  f.poller.stop(); await f.finish();
});
test('switching apps between requests preserves the next paced heartbeat', async () => {
  const f = fixture(); await f.finish(); assert.equal(f.timers.size, 1);
  f.hide(); assert.equal(f.timers.size, 1); f.tick(); assert.equal(f.requests, 2);
  f.poller.stop(); await f.finish();
});

test('only a typed HTTP410 ends a room, not retries or similar error wording', async () => {
  const { DuoApiError, isDuoTerminalError } = await import('../src/lib/duo-client-lifecycle');
  assert.equal(isDuoTerminalError(new DuoApiError(410, 'Room expired')), true);
  for (const status of [401, 404, 409, 429, 500, 503]) assert.equal(isDuoTerminalError(new DuoApiError(status, 'Room expired')), false);
  assert.equal(isDuoTerminalError(new Error('Room expired')), false);
  assert.equal(isDuoTerminalError({ status: 410 }), false);
});
test('terminal polling failure stops retries and future lifecycle wakes', async () => {
  const { DuoApiError } = await import('../src/lib/duo-client-lifecycle');
  let requests = 0, failures = 0, scheduled = 0;
  const poller = startDuoPolling({
    request: async () => { requests++; throw new DuoApiError(410, 'Room expired'); },
    failure: () => { failures++; }, isHidden: () => false, isVoiceActive: () => true,
    schedule: () => { scheduled++; return 1 as unknown as ReturnType<typeof setTimeout>; },
  });
  await Promise.resolve(); await Promise.resolve(); poller.wake();
  assert.equal(requests, 1); assert.equal(failures, 1); assert.equal(scheduled, 0); poller.stop();
});


test('conditional heartbeat responses never attempt JSON parsing', async () => {
 const { readDuoResponseJson } = await import('../src/lib/duo-client-lifecycle');
 for (const status of [304, 204]) {
  const response = new Response(null, {status});
  response.json = async () => { throw new Error('must not read a missing body'); };
  assert.equal(await readDuoResponseJson(response), null);
 }
 assert.deepEqual(await readDuoResponseJson(Response.json({revision: 2})), {revision: 2});
});


test('client prefers the unmodified application validator over CDN ETags', async () => {
 const {duoResponseValidator} = await import('../src/lib/duo-client-lifecycle');
 assert.equal(duoResponseValidator(new Response(null,{headers:{'X-Duo-ETag':'"application"',ETag:'W/"compressed"'}})), '"application"');
 assert.equal(duoResponseValidator(new Response(null,{headers:{ETag:'W/"fallback"'}})), 'W/"fallback"');
 assert.equal(duoResponseValidator(new Response(null)), undefined);
});

test('a stalled request times out and aborts while caller cancellation retains its reason', async () => {
  const { withDuoDeadline, DuoTimeoutError } = await import('../src/lib/duo-client-lifecycle');
  let requestSignal: AbortSignal | undefined;
  await assert.rejects(withDuoDeadline(signal => {
    requestSignal = signal;
    return new Promise(() => {});
  }, undefined, 5), DuoTimeoutError);
  assert.equal(requestSignal?.aborted, true);
  const caller = new AbortController();
  const pending = withDuoDeadline(() => new Promise(() => {}), caller.signal);
  caller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
});

test('only an authoritative missing-room response terminates a 404 reconnection', async () => {
  const { DuoApiError, isDuoTerminalError } = await import('../src/lib/duo-client-lifecycle');
  assert.equal(isDuoTerminalError(new DuoApiError(404, 'Not found')), false);
  assert.equal(isDuoTerminalError(new DuoApiError(404, 'Not found', 'room_not_found')), true);
});
