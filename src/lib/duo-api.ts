import { boundedText } from "./request-body";
import { DuoError } from "./duo-engine";
export interface DuoEnv { DUO_ROOMS?: DurableObjectNamespace }
export const DUO_ROOM_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function duoJson(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" } });
}
/** GET validators use weak comparison: compression intermediaries may add W/. */
export function duoIfNoneMatch(header: string | null, etag: string): boolean {
  if (!header) return false;
  const value = header.trim();
  if (value === "*") return true;
  // Validate the complete list, preserving commas inside quoted opaque tags.
  const tag = '(?:W/)?"[\\x21\\x23-\\x7E\\x80-\\xFF]*"';
  if (!new RegExp(`^[ \t]*(?:${tag}[ \t]*)?(?:,[ \t]*(?:${tag}[ \t]*)?)*$`).test(value)) return false;
  const opaque = etag.replace(/^W\//, "");
  return (value.match(new RegExp(tag, "g")) ?? []).some(candidate => candidate.replace(/^W\//, "") === opaque);
}
export async function duoHash(secret: string): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret))), b => b.toString(16).padStart(2, "0")).join("");
}
export function duoSecret(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join("");
}
export function duoBearer(request: Request): string {
  const match = /^Bearer ([0-9a-f]{64})$/.exec(request.headers.get("Authorization") ?? "");
  if (!match) throw new DuoError(401, "Room membership required");
  return match[1];
}
export function duoSameOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  const site = request.headers.get("Sec-Fetch-Site");
  return (!origin || origin === new URL(request.url).origin) && (!site || site === "same-origin" || site === "none");
}
export async function duoBody(request: Request): Promise<Record<string, unknown>> {
  if (!(request.headers.get("Content-Type") ?? "").toLowerCase().startsWith("application/json")) throw new DuoError(415, "JSON content required");
  let value: unknown;
  try { value = JSON.parse(await boundedText(request, 4096)); }
  catch (error) { throw new DuoError(error instanceof RangeError ? 413 : 400, error instanceof RangeError ? "Request too large" : "Invalid JSON"); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new DuoError(400, "A JSON object is required");
  return value as Record<string, unknown>;
}
export interface DuoMembership { memberId: string; channel: string; uid: number; peerUid: number }
/** Server-only authorization, including active room and two-member requirements. */
export async function requireDuoMembership(request: Request, env: DuoEnv, roomId: string): Promise<DuoMembership> {
  if (!env.DUO_ROOMS) throw new DuoError(503, "Shared rooms are temporarily unavailable");
  if (!DUO_ROOM_ID.test(roomId)) throw new DuoError(400, "Invalid room");
  if (!duoSameOrigin(request)) throw new DuoError(403, "Origin not allowed");
  const credential = duoBearer(request);
  const response = await env.DUO_ROOMS.getByName(roomId).fetch(new Request("https://duo.internal/membership", { headers: { Authorization: `Bearer ${credential}` } }));
  const result = await response.json() as DuoMembership & { error?: string };
  if (!response.ok) throw new DuoError(response.status, result.error ?? "Room membership required");
  return result;
}
/** Public router. Only server-created internal requests can reach DO operations. */
export async function duo(request: Request, env: DuoEnv): Promise<Response> {
  try {
    if (!env.DUO_ROOMS) return duoJson({ error: "Shared rooms are temporarily unavailable" }, 503);
    const url = new URL(request.url);
    if (!duoSameOrigin(request)) return duoJson({ error: "Origin not allowed" }, 403);
    const match = /^\/api\/duo\/rooms(?:\/([^/]+)(?:\/(join|command|invite|preview))?)?$/.exec(url.pathname);
    if (!match) return duoJson({ error: "Room endpoint not found" }, 404);
    const [, existingId, action] = match;
    if (existingId && !DUO_ROOM_ID.test(existingId)) return duoJson({ error: "Invalid room" }, 400);
    const isCreate = !existingId;
    if (request.method !== (isCreate || action ? "POST" : "GET")) return duoJson({ error: "Method not allowed" }, 405);
    if (request.method === "POST" && request.headers.get("Origin") !== url.origin) return duoJson({ error: "Origin not allowed" }, 403);
    // Hash daily network identity; never store raw IPs in room state.
    const networkKey = await duoHash(`${Math.floor(Date.now() / 86400000)}|duo|${request.headers.get("CF-Connecting-IP") ?? "local"}`);
    const gate = await env.DUO_ROOMS.getByName(`gate:${networkKey}`).fetch(new Request("https://duo.internal/rate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: isCreate ? "create" : action === "join" || action === "preview" ? "join" : "request" }) }));
    if (!gate.ok) return duoJson({ error: "Please slow down and try again shortly" }, 429);
    const roomId = existingId ?? crypto.randomUUID();
    const headers = new Headers({ "X-Duo-Room": roomId, "X-Duo-Network": networkKey });
    if (!isCreate && action !== "join" && action !== "preview") headers.set("Authorization", `Bearer ${duoBearer(request)}`);
    if (request.method === "GET") {
      const customValidator = request.headers.get("X-Duo-If-None-Match");
      if (customValidator !== null) headers.set("X-Duo-If-None-Match", customValidator);
      if (request.headers.has("If-None-Match")) headers.set("If-None-Match", request.headers.get("If-None-Match")!);
    }
    let body: string | undefined;
    if (request.method === "POST") { body = JSON.stringify(await duoBody(request)); headers.set("Content-Type", "application/json"); }
    return await env.DUO_ROOMS.getByName(roomId).fetch(new Request(`https://duo.internal/${isCreate ? "create" : action ?? "snapshot"}`, { method: request.method, headers, body }));
  } catch (error) {
    return duoJson({ error: error instanceof DuoError ? error.message : "Shared room unavailable. Please try again.", ...(error instanceof DuoError && error.reason ? { reason: error.reason } : {}) }, error instanceof DuoError ? error.status : 500);
  }
}
