import assert from "node:assert/strict";
import test from "node:test";
import { duo, duoHash, duoSecret, requireDuoMembership, type DuoEnv } from "../src/lib/duo-api";
const origin = "https://1in8bn.com";
const roomId = "acb423cd-bc45-43cc-b225-369dfdb51ee2";
const credential = "c".repeat(64);
function environment(handler: (name: string, request: Request) => Response | Promise<Response>): DuoEnv {
  return { DUO_ROOMS: { getByName(name: string) { return { fetch: (request: Request) => handler(name, request) }; } } as unknown as DurableObjectNamespace };
}
function request(path = "", method = "GET", body?: unknown, headers: Record<string, string> = {}) {
  return new Request(`${origin}/api/duo/rooms${path}`, { method, headers: { Origin: origin, "Content-Type": "application/json", Authorization: `Bearer ${credential}`, ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
}
test("secrets are unpredictable, hash-only membership keys", async () => {
  const first = duoSecret(), second = duoSecret();
  assert.match(first, /^[a-f0-9]{64}$/); assert.notEqual(first, second);
  assert.notEqual(await duoHash(first), first);
  assert.equal(await duoHash(first), await duoHash(first));
});
test("origin, membership, method, body limits and route validation reject at the boundary", async () => {
  let forwards = 0;
  const env = environment(() => { forwards++; return Response.json({}); });
  assert.equal((await duo(request(`/${roomId}`, "GET", undefined, { Origin: "https://evil.test" }), env)).status, 403);
  assert.equal((await duo(request(`/${roomId}`, "GET", undefined, { Authorization: "" }), env)).status, 401);
  assert.equal((await duo(request("/bad-id"), env)).status, 400);
  assert.equal((await duo(request(`/${roomId}`, "DELETE"), env)).status, 405);
  assert.equal((await duo(request("", "POST", { name: "x".repeat(5000) }), env)).status, 413);
  assert.equal((await duo(request("", "POST", {}, { Origin: "" }), env)).status, 403);
  assert.equal((await duo(request("", "POST", {}, { "Content-Type": "text/plain" }), env)).status, 415);
  assert.equal(forwards, 3, "only valid origin requests reach the rate gate before body/auth rejection");
});
test("streamed oversized request bodies are bounded before room allocation", async () => {
  const env = environment(name => { assert.ok(name.startsWith("gate:")); return Response.json({ ok: true }); });
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(5000)); controller.close(); } });
  const response = await duo(new Request(`${origin}/api/duo/rooms`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: stream, duplex: "half" } as RequestInit), env);
  assert.equal(response.status, 413);
});
test("persistent network rate gate can stop creation and returns no-store errors", async () => {
  const env = environment((name, req) => { assert.ok(name.startsWith("gate:")); assert.equal(new URL(req.url).pathname, "/rate"); return Response.json({}, { status: 429 }); });
  const response = await duo(request("", "POST", { name: "Ari" }), env);
  assert.equal(response.status, 429); assert.equal(response.headers.get("Cache-Control"), "no-store");
});
test("router forwards only trusted identity headers and bounded JSON to the intended room", async () => {
  let allocations = 0;
  const env = environment(async (name, req) => {
    if (name.startsWith("gate:")) return Response.json({ ok: true });
    allocations++;
    assert.equal(name, req.headers.get("X-Duo-Room"));
    assert.match(name, /^[a-f0-9-]{36}$/);
    assert.equal(req.headers.get("X-Untrusted"), null);
    assert.equal(new URL(req.url).pathname, "/create");
    assert.deepEqual(await req.json(), { name: "Ari" });
    return Response.json({ created: true }, { status: 201 });
  });
  const response = await duo(request("", "POST", { name: "Ari" }, { "X-Untrusted": "unsafe" }), env);
  assert.equal(response.status, 201); assert.equal(allocations, 1);
});
test("voice authorization passes only stable server-assigned channel and member IDs", async () => {
  const env = environment((name, req) => {
    assert.equal(name, roomId); assert.equal(new URL(req.url).pathname, "/membership");
    assert.equal(req.headers.get("Authorization"), `Bearer ${credential}`);
    return Response.json({ memberId: "first", channel: `duo_${roomId}`, uid: 1, peerUid: 2 });
  });
  assert.deepEqual(await requireDuoMembership(request(`/${roomId}/voice`, "POST", {}), env, roomId), { memberId: "first", channel: `duo_${roomId}`, uid: 1, peerUid: 2 });
  const denied = environment(() => Response.json({ error: "This room is closed" }, { status: 410 }));
  await assert.rejects(requireDuoMembership(request(`/${roomId}/voice`, "POST", {}), denied, roomId), /closed/);
});

test('preview admits fragment-secret JSON without membership and never forwards query credentials', async()=>{
 let path='';const env=environment(async(name,req)=>{if(name.startsWith('gate:'))return Response.json({ok:true});path=new URL(req.url).pathname;assert.equal(new URL(req.url).search,'');assert.equal(req.headers.get('Authorization'),null);assert.deepEqual(await req.json(),{inviteSecret:'a'.repeat(64)});return Response.json({inviterName:'Ari',status:'waiting',expiresAt:123});});
 const result=await duo(request(`/${roomId}/preview?name=ignored&inviteSecret=ignored`,'POST',{inviteSecret:'a'.repeat(64)},{Authorization:''}),env);assert.equal(result.status,200);assert.equal(path,'/preview');
});
test('invitation renewal requires membership and is a dedicated POST', async()=>{
 const env=environment(()=>Response.json({ok:true}));
 assert.equal((await duo(request(`/${roomId}/invite`,'POST',{}, {Authorization:''}),env)).status,401);
 assert.equal((await duo(request(`/${roomId}/invite`,'GET'),env)).status,405);
 assert.equal((await duo(request(`/${roomId}/invite`,'POST',{}),env)).status,200);
});


test('conditional snapshot validators pass through the authenticated public router', async () => {
 const env = environment((name, req) => {
  if(name.startsWith('gate:')) return Response.json({ok:true});
  assert.equal(req.headers.get('If-None-Match'), '"private-validator"');
  assert.equal(req.headers.get('Authorization'), `Bearer ${credential}`);
  return new Response(null, {status:304,headers:{ETag:'"private-validator"','Cache-Control':'no-store'}});
 });
 const response = await duo(request(`/${roomId}`, 'GET', undefined, {'If-None-Match':'"private-validator"'}), env);
 assert.equal(response.status, 304); assert.equal(await response.text(), '');
 assert.equal(response.headers.get('Cache-Control'), 'no-store');
});
