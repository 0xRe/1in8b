import { DurableObject } from "cloudflare:workers";
import { applyDuoCommand, assertDuoActive, assertDuoInvitation, normalizeDuoState, renewDuoInvite, cleanDuoName, createDuoState, createFullDuoState, duoSnapshot, DuoError, joinDuo, type DuoCommand, type DuoState, DUO_PRESENCE_MS } from "./lib/duo-engine";
import { duoBearer, duoBody, duoHash, duoIfNoneMatch, duoJson, duoSecret, DUO_ROOM_ID } from "./lib/duo-api";

interface StoredRate { minute: number; count: number }
/** A SQLite-backed room owns its membership, command ordering and persisted story. */
export class DuoRoom extends DurableObject {
  private cachedState?: DuoState;
  private snapshots = new Map<string, { key: string; etag: string; body: string }>();
  async fetch(request: Request): Promise<Response> {
    // blockConcurrencyWhile covers crypto awaits as well as storage writes: two claims or
    // approvals cannot inspect the same pre-command state on separate requests.
    return this.ctx.blockConcurrencyWhile(async () => {
      try { return await this.handle(request); }
      catch (error) { this.cachedState = undefined; this.snapshots.clear(); return duoJson({ error: error instanceof DuoError ? error.message : "Shared room unavailable. Please try again.", ...(error instanceof DuoError && error.reason ? { reason: error.reason } : {}) }, error instanceof DuoError ? error.status : 500); }
    });
  }
  private async rate(key: string, limit: number, now: number): Promise<void> {
    const storageKey = `rate:${key}`;
    const minute = Math.floor(now / 60_000);
    const old = await this.ctx.storage.get<StoredRate>(storageKey);
    const count = old?.minute === minute ? old.count + 1 : 1;
    await this.ctx.storage.put(storageKey, { minute, count });
    if (count > limit) throw new DuoError(429, "Please slow down and try again shortly");
  }
  private async handle(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname;
    const now = Date.now();
    if (path === "/rate") {
      const body = await duoBody(request);
      const kind = body.kind === "create" ? "create" : body.kind === "join" ? "join" : "request";
      await this.ctx.storage.setAlarm(now + 120_000);
      await this.rate(kind, kind === "create" ? 8 : kind === "join" ? 20 : 180, now);
      return duoJson({ ok: true });
    }
    let state = await this.readState();
    if (path === "/create") {
      if (state) throw new DuoError(409, "This room already exists");
      const roomId = request.headers.get("X-Duo-Room") ?? "";
      if (!DUO_ROOM_ID.test(roomId)) throw new DuoError(400, "Invalid room");
      const body = await duoBody(request);
      const name = cleanDuoName(body.name);
      const credential = duoSecret(), inviteSecret = duoSecret(), memberId = crypto.randomUUID();
      if (body.gentler !== undefined && typeof body.gentler !== "boolean") throw new DuoError(400,"Gentler mode must be true or false");
      state = (body.mode === "short-story" ? createDuoState : createFullDuoState)(roomId, name, memberId, await duoHash(credential), await duoHash(inviteSecret), now, body.gentler !== false);
      await this.writeState(state);
      await this.ctx.storage.setAlarm(state.expiresAt);
      return duoJson({ credential, inviteSecret, snapshot: duoSnapshot(state, memberId, now) }, 201);
    }
    if (!state) throw new DuoError(404, "Room not found", "room_not_found");
    normalizeDuoState(state);
    // Presence is a separate tiny record, overlaid before authorization and commands.
    const presence = await this.ctx.storage.get<Record<string, number>>("presence");
    for (const member of state.members) member.lastSeen = Math.max(member.lastSeen, presence?.[member.id] ?? 0);
    if (state.expiresAt <= now) { this.cachedState = undefined; this.snapshots.clear(); await this.ctx.storage.deleteAll(); throw new DuoError(410, "This room has expired", "invitation_expired"); }
    if (path === "/preview") {
      await this.rate("join", 20, now);
      const body = await duoBody(request);
      if (typeof body.inviteSecret !== "string" || !/^[a-f0-9]{64}$/.test(body.inviteSecret)) throw new DuoError(403, "Invalid invitation", "invitation_missing");
      const inviteHash = await duoHash(body.inviteSecret);
      const retained = typeof body.admissionCredential === "string" && /^[a-f0-9]{64}$/.test(body.admissionCredential) ? await duoHash(body.admissionCredential) : null;
      const recovered = state.claimedInviteHash === inviteHash && retained && state.members.slice(1).some(member => member.credentialHash === retained);
      if (recovered) assertDuoActive(state, now); else assertDuoInvitation(state, inviteHash, now);
      return duoJson({ inviterName: state.members[0].name, expiresAt: state.inviteExpiresAt, status: state.phase });
    }
    if (path === "/join") {
      await this.rate("join", 20, now);
      const body = await duoBody(request);
      const name = cleanDuoName(body.name);
      if (typeof body.inviteSecret !== "string" || !/^[a-f0-9]{64}$/.test(body.inviteSecret)) throw new DuoError(403, "Invalid invitation", "invitation_missing");
      if (typeof body.admissionCredential !== "string" || !/^[a-f0-9]{64}$/.test(body.admissionCredential)) throw new DuoError(400, "A retained admission credential is required");
      const credential = body.admissionCredential;
      const credentialHash = await duoHash(credential);
      const existing = state.members.find(member => member.credentialHash === credentialHash);
      // A client persists this random secret before joining. If the response was
      // lost after the invitation claim committed, the same client can recover.
      if (existing && existing.id !== state.members[0].id && (!state.claimedInviteHash || state.claimedInviteHash === await duoHash(body.inviteSecret))) {
        assertDuoActive(state, now);
        existing.lastSeen = now;
        await this.writePresence(state);
        return duoJson({ credential, snapshot: duoSnapshot(state, existing.id, now) });
      }
      const memberId = crypto.randomUUID();
      joinDuo(state, name, memberId, credentialHash, await duoHash(body.inviteSecret), now);
      await this.writeState(state);
      return duoJson({ credential, snapshot: duoSnapshot(state, memberId, now) });
    }
    await this.rate("auth", 180, now);
    const credentialHash = await duoHash(duoBearer(request));
    const actor = state.members.find(member => member.credentialHash === credentialHash);
    if (!actor) throw new DuoError(401, "Room membership required");
    if (path === "/invite") {
      await duoBody(request);
      const inviteSecret = duoSecret();
      renewDuoInvite(state, actor.id, await duoHash(inviteSecret), now);
      actor.lastSeen = now;
      await this.writeState(state);
      return duoJson({ inviteSecret, inviteExpiresAt: state.inviteExpiresAt, snapshot: duoSnapshot(state, actor.id, now) });
    }
    if (path === "/membership") {
      assertDuoActive(state, now);
      if (state.members.length !== 2 || state.members.some(member => now - member.lastSeen > 35_000)) throw new DuoError(409, "Both friends must be present in an active room");
      const uid = state.members.indexOf(actor) + 1;
      return duoJson({ memberId: actor.id, channel: `duo_${state.roomId}`, uid, peerUid: uid === 1 ? 2 : 1 });
    }
    actor.lastSeen = now;
    await this.writePresence(state);
    if (path === "/snapshot") return this.snapshotResponse(state, actor.id, now, request);
    let receiptKey: string | undefined;
    let receipt: string | undefined;
    if (path === "/command") {
      await this.rate(`command:${actor.id}`, 45, now);
      const body = await duoBody(request);
      if (typeof body.id === "string" && /^[a-zA-Z0-9_-]{8,80}$/.test(body.id)) {
        receiptKey = `receipt:${actor.id}:${body.id}`;
        const prior = await this.ctx.storage.get<string>(receiptKey);
        if (prior !== undefined) state.receipts[actor.id] = { [body.id]: prior };
      }
      // Never accept actor IDs, scores, or stage state from the browser.
      const beforeRevision = state.revision;
      applyDuoCommand(state, actor.id, body as unknown as DuoCommand, now);
      receipt = state.receipts[actor.id]?.[String(body.id)];
      if (state.lifetime && state.phase !== 'closed' && state.revision !== beforeRevision) {
        const retention = state.phase === 'complete' ? 24 * 3600_000 : 7 * 24 * 3600_000;
        if (state.phase === 'complete') state.expiresAt = Math.min(state.expiresAt, now + retention);
        else if (!state.pausedBy.length) state.expiresAt = now + retention;
        await this.ctx.storage.setAlarm(state.expiresAt);
      }
    } else if (path !== "/snapshot") throw new DuoError(404, "Room endpoint not found");
    // Each receipt is its own small record. Keeping all chat payload fingerprints
    // inside the room JSON would eventually exceed the per-value storage limit.
    state.receipts = {};
    await this.ctx.storage.transaction(async transaction => {
      await this.writeState(state, transaction);
      if (receiptKey && receipt !== undefined) await transaction.put(receiptKey, receipt);
    });
    return this.snapshotResponse(state, actor.id, now);
  }
  private async writePresence(state: DuoState): Promise<void> {
    await this.ctx.storage.put("presence", Object.fromEntries(state.members.map(member => [member.id, member.lastSeen])));
  }
  private async snapshotResponse(state: DuoState, actorId: string, now: number, request?: Request): Promise<Response> {
    const peer = state.members.find(member => member.id !== actorId);
    const full = state.lifetime;
    // All snapshot changes are revision-bound except presence and playback's timed
    // fallback driver. Do not include a peer's private Life or credential in a tag.
    const online = !!peer && now - peer.lastSeen <= DUO_PRESENCE_MS;
    const driver = full ? full.players[actorId].life.alive && (state.members.find(member => full.players[member.id].life.alive)?.id === actorId || now >= full.playback.nextAdvanceAt + 3000) : false;
    const key = JSON.stringify([actorId, state.revision, state.runIndex, state.expiresAt, online, driver]);
    let cached = this.snapshots.get(actorId);
    if (cached?.key !== key) {
      const actor = state.members.find(member => member.id === actorId)!;
      cached = { key, etag: `"${await duoHash(`${actor.credentialHash}|${key}`)}"`, body: JSON.stringify(duoSnapshot(state, actorId, now)) };
      // At most one current representation per actor; never retain whole histories
      // for every revision of a long game.
      this.snapshots.set(actorId, cached);
    }
    const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", ETag: cached.etag, "X-Duo-ETag": cached.etag };
    const customValidator = request?.headers.get("X-Duo-If-None-Match");
    const validator = customValidator ?? request?.headers.get("If-None-Match") ?? null;
    if (duoIfNoneMatch(validator, cached.etag)) return new Response(null, { status: customValidator != null ? 204 : 304, headers });
    return new Response(cached.body, { headers: { ...headers, "Content-Type": "application/json" } });
  }
  private async readState(): Promise<DuoState | undefined> {
    if (this.cachedState) return this.cachedState;
    const stored = await this.ctx.storage.get<DuoState | { chunks: number }>("room");
    if (!stored || !("chunks" in stored)) return this.cachedState = stored;
    const parts = await Promise.all(Array.from({length: stored.chunks}, (_,i) => this.ctx.storage.get<string>(`room-part:${i}`)));
    if (parts.some(p => p === undefined)) throw new Error("Incomplete room storage");
    return this.cachedState = JSON.parse(parts.join('')) as DuoState;
  }
  private async writeState(state: DuoState, storage?: Pick<DurableObjectStorage, 'put' | 'get' | 'delete'> | Pick<DurableObjectTransaction, 'put' | 'get' | 'delete'>): Promise<void> {
    if (!storage) {
      await this.ctx.storage.transaction(transaction => this.writeState(state, transaction));
      this.cachedState = state;
      return;
    }
    const text = JSON.stringify(state), chunks = Math.ceil(text.length / 24000);
    for (let i = 0; i < chunks; i++) await storage.put(`room-part:${i}`, text.slice(i * 24000, (i + 1) * 24000));
    const previous = await storage.get<{chunks?:number}>("room");
    for (let i=chunks;i<(previous?.chunks ?? 0);i++) await storage.delete(`room-part:${i}`);
    await storage.put("room", { chunks });
  }
  async alarm(): Promise<void> {
    const state = await this.readState();
    if (state && state.expiresAt > Date.now()) { await this.ctx.storage.setAlarm(state.expiresAt); return; }
    this.cachedState = undefined; this.snapshots.clear(); await this.ctx.storage.deleteAll();
  }
}
