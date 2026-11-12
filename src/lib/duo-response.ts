import { DuoApiError, duoResponseValidator } from './duo-client-lifecycle';

const reasons = ['invalid_invite', 'invitation_missing', 'invitation_expired', 'invitation_used', 'room_full', 'room_not_found', 'unauthorized', 'room_expired', 'stale_proposal', 'partner_offline', 'rate_limited', 'stale_life', 'stale_clock', 'decision_pending', 'action_unavailable'] as const;
type Reason = typeof reasons[number] | 'stale_state' | 'network' | 'invalid_response' | 'storage_unavailable' | 'server_error' | 'request_rejected' | 'unknown';
export class DuoRequestError extends DuoApiError {
  constructor(status: number, public readonly classification: Reason, message: string) { super(status, message, classification); }
}
function safeReason(value: unknown): Reason | undefined { return reasons.find(reason => reason === value); }
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown) => typeof value === 'number' && Number.isFinite(value);
/** Validate the envelope before a malformed successful response reaches the game UI. */
function snapshotEnvelope(value: unknown): boolean {
  if (!object(value) || !object(value.self) || !object(value.invitation)) return false;
  return typeof value.roomId === 'string' && ['waiting','planning','review','complete','closed'].includes(String(value.phase)) &&
    ['revision','runIndex','stage','age','proposalVersion'].every(key => finite(value[key])) &&
    typeof value.self.id === 'string' && typeof value.self.name === 'string' && typeof value.self.ready === 'boolean' && object(value.self.life) && Array.isArray(value.self.archives) &&
    (value.partner === null || object(value.partner) && typeof value.partner.id === 'string' && typeof value.partner.ready === 'boolean') &&
    ['history','messages','pausedBy','replayVotes','personalOptions'].every(key => Array.isArray(value[key])) &&
    (value.proposal === null || object(value.proposal) && Array.isArray(value.proposal.approvals)) &&
    (value.lifetime === undefined || object(value.lifetime) && object(value.lifetime.self) && object(value.lifetime.self.life) && Array.isArray(value.lifetime.memories) && object(value.lifetime.playback));
}
export type DuoResponseKind = 'snapshot' | 'admission' | 'invitation' | 'preview';
export async function readDuoApiResponse(response: Response, kind: DuoResponseKind, conditional?: { etag?: string }): Promise<unknown> {
  if ((response.status === 304 || response.status === 204) && conditional) return null;
  let data: unknown;
  try { data = await response.json(); } catch { data = null; }
  if (!response.ok) {
    const reason = object(data) ? safeReason(data.reason) ?? safeReason(data.error) : undefined;
    const classification = reason ?? (response.status === 409 ? 'stale_state' : response.status >= 500 ? 'server_error' : 'request_rejected');
    const messages: Partial<Record<Reason, string>> = {
      invitation_missing: 'This link is incomplete. Ask your friend to share a fresh invitation.',
      room_not_found: 'This room is no longer available. Ask your friend to create and share a new room.',
      invitation_expired: 'This invitation expired. Ask your friend to create a fresh invitation in their room.',
      invitation_used: 'This invitation was already used. Return in the browser where you joined, or ask your friend for a new room.',
      room_full: 'Both places in this room are already taken. Open your saved room on the device you used to join, or create a new room.',
      invalid_invite: 'This invitation is no longer valid. Ask your friend for a fresh invitation.',
      stale_life: 'Your life changed while you were choosing. Review the latest event, then try again.',
      stale_clock: 'Your friend already advanced your lives. Review the latest moment before continuing.',
      decision_pending: 'One of you has a decision waiting. Resolve the current choices before continuing.',
      action_unavailable: 'That action is not available in your current life. Review the current choices and requirements.',
      stale_proposal: 'The shared plan changed. Read the latest proposal before confirming it.',
      partner_offline: 'Your friend is away. Continue when you are both connected.',
    };
    const fallback: Record<number, string> = { 401: 'This device could not reconnect to your character. Use the device you joined with.', 403: 'This invitation is no longer valid. Ask your friend for a fresh invitation.', 404: 'This room could not be found. It may have expired.', 409: 'The room changed while you were choosing. Review the latest plan before trying again.', 410: 'This room has ended or expired. You can start a new story below.', 429: 'A few too many requests arrived at once. Wait a moment, then try again.' };
    throw new DuoRequestError(response.status, classification, messages[classification] ?? fallback[response.status] ?? 'That action could not be saved. Reconnect and try again; your last saved choices are safe.');
  }
  const valid = kind === 'snapshot' ? snapshotEnvelope(data) : object(data) && (kind === 'preview' ? typeof data.inviterName === 'string' : snapshotEnvelope(data.snapshot) && (kind === 'admission' ? typeof data.credential === 'string' && data.credential.length > 0 : typeof data.inviteSecret === 'string'));
  if (!valid) throw new DuoRequestError(response.status, 'invalid_response', 'The room returned an incomplete response. Reconnect and try again.');
  if (conditional) conditional.etag = duoResponseValidator(response);
  return data;
}
