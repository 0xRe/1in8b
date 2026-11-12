import { DuoRoomSceneVertical } from './DuoRoomSceneVertical';
import { DuoLocaleMenu } from './DuoLocaleMenu';
import { getDuoLandingCopy } from '../lib/duo-i18n';
import type { Locale } from '../lib/i18n';
import { duoPath, localePath } from '../lib/site-url';
import { duoEntryChoice, validDuoSecret } from '../lib/duo-entry';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCheck, Copy, Download, Heart, HeartHandshake, Link2, LoaderCircle, LockKeyhole, MessageCircle, Mic, Pause, Play, RefreshCw, Send, Share2, Sprout, Users, X } from 'lucide-react';
import { Portrait } from './Visuals';
import { DuoLifetime } from './DuoLifetime';
import { DuoSelect } from './DuoSelect';
import { DuoVoice } from './DuoVoice';
import { DuoKeepsake } from './DuoKeepsake';
import { DuoLandingSections, DuoThemeToggle } from './DuoLanding';
import { PoweredByAgora } from './DuoAgora';
import { duoCommandPayload } from '../lib/duo-client-command';
import { duoInvitationShare } from '../lib/duo-invitation';
import { DuoTimeoutError, isDuoTerminalError, startDuoPolling, withDuoDeadline } from '../lib/duo-client-lifecycle';
import { DuoRequestError, readDuoApiResponse, type DuoResponseKind } from '../lib/duo-response';
import './duo-game.css';

import { type DuoSnapshot as Snapshot, type DuoCommand, type PersonalChoice, type Residence, type Support } from '../lib/duo-engine';

interface Admission { credential: string; snapshot: Snapshot; inviteSecret?: string }
interface Invite { roomId: string; secret: string; admissionCredential?: string; name?: string }
type Command = DuoCommand extends infer C ? C extends { id: string } ? Omit<C, 'id' | 'stage' | 'runIndex' | (C extends { kind: 'personal' } ? 'proposalVersion' : never)> : never : never;
const ROOM_KEY = '1in8bn-duo-member:';
const INVITE_KEY = '1in8bn-duo-invite:';
const TAB_KEY = '1in8bn-duo-tab-member:';
const LAST_KEY = '1in8bn-duo-last';
const INCOMPLETE_KEY = '1in8bn-duo-incomplete-link:';
const ACCEPTED_KEY = '1in8bn-duo-accepted-invite:';
const PENDING_KEY = '1in8bn-duo-pending:';
const LANGUAGE_DRAFT_KEY = '1in8bn-duo-language-draft';
const CONNECTION_ERROR = 'Connection interrupted. Your last saved choices are safe. Reconnect to continue.';
function admissionCredential() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
}
function pendingInvite(roomId: string): Invite | null {
  try {
    const pending: unknown = JSON.parse(readStorage(browserStorage('sessionStorage'), PENDING_KEY + roomId) ?? 'null');
    if (!pending || typeof pending !== 'object' || !('roomId' in pending) || pending.roomId !== roomId || !('secret' in pending) || !validDuoSecret(pending.secret)) return null;
    const item = pending as Invite;
    return { roomId, secret: item.secret, ...(typeof item.admissionCredential === 'string' && /^[a-f0-9]{64}$/.test(item.admissionCredential) ? { admissionCredential: item.admissionCredential } : {}), ...(typeof item.name === 'string' ? { name: item.name.slice(0, 24) } : {}) };
  } catch { return null; }
}
const CHAPTERS = [
  { name: 'A beginning', subtitle: 'Age 20 · Make room for each other', prompt: 'Two lives arrive at the same turning point. What will each of you pursue, and how much of the journey will you share?' },
  { name: 'Finding a rhythm', subtitle: 'Age 25 · Ambition meets everyday life', prompt: 'Five years have passed. Your choices have changed your own circumstances. Compare what you want next, then agree on a shared plan.' },
  { name: 'What we build', subtitle: 'Age 30 · Choose the shape of your future', prompt: 'One final turning point. There is no perfect ending: only the life you each choose, and the commitments you both accept.' },
];
const CHOICES: { id: PersonalChoice; label: string; description: string; icon: string }[] = [
  { id: 'career', label: 'Focus on my career', description: 'Put time into work and your own earning potential.', icon: '↗' },
  { id: 'study', label: 'Make space to learn', description: 'Invest in a different future through study.', icon: '✦' },
  { id: 'care', label: 'Choose time and care', description: 'Give more attention to wellbeing and everyday life.', icon: '♡' },
];
const RESIDENCE: Record<Residence, string> = { together: 'Live together', apart: 'Keep separate homes' };
const SUPPORT: Record<Support, string> = { independent: 'Keep finances independent', share: 'Share resources equally', 'support-partner': 'Offer support to the other person' };
function browserStorage(kind: 'localStorage' | 'sessionStorage'): Storage | null { try { return window[kind]; } catch { return null; } }
function readStorage(storage: Storage | null, key: string) { try { return storage?.getItem(key) ?? null; } catch { return null; } }
function writeStorage(storage: Storage | null, key: string, value: string) { try { if (!storage) return false; storage.setItem(key, value); return true; } catch { return false; } }
function removeStorage(storage: Storage | null, key: string) { try { storage?.removeItem(key); } catch { /* A private browsing policy may block storage. */ } }
function seedFor(value: string) { let seed = 7; for (const char of value) seed = (seed * 31 + char.charCodeAt(0)) >>> 0; return seed; }

function commandId() { return crypto.randomUUID(); }
async function api<T>(path: string, body?: unknown, token?: string, signal?: AbortSignal, conditional?: { etag?: string }, kind: DuoResponseKind = 'snapshot'): Promise<T> {
  return withDuoDeadline(async deadline => {
    const response = await fetch(`/api/duo/rooms${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(conditional?.etag ? { 'If-None-Match': conditional.etag, 'X-Duo-If-None-Match': conditional.etag } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: deadline,
    });
    const validator = conditional && { ...conditional };
    const data = await readDuoApiResponse(response, kind, validator) as T;
    deadline.throwIfAborted();
    if (conditional && validator) conditional.etag = validator.etag;
    return data;
  }, signal);
}

export function DuoGame({ initialLocale = 'en' }: { initialLocale?: Locale } = {}) {
  const locale = initialLocale;
  const copy = getDuoLandingCopy(locale);

  const latestSnapshot = useRef<Snapshot | null>(null);
  const pollingError = useRef<string | null>(null);
  const [name, setName] = useState('');
  const [gentler, setGentler] = useState(true);
  const [roomId, setRoomId] = useState('');
  const [token, setToken] = useState('');
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [terminal, setTerminal] = useState(false);
  const terminalRef = useRef(false);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [inviteSecret, setInviteSecret] = useState('');
  const [inviterName, setInviterName] = useState('');
  const [invitePreviewError, setInvitePreviewError] = useState('');
  const [voiceActive, setVoiceActive] = useState(false);
  const voiceActiveRef = useRef(false);
  voiceActiveRef.current = voiceActive;
  const [previousRoom, setPreviousRoom] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [connection, setConnection] = useState<'connecting' | 'online' | 'offline'>('connecting');
  const [retry, setRetry] = useState(0);
  const [chat, setChat] = useState('');
  const [residence, setResidence] = useState<Residence>('together');
  const [support, setSupport] = useState<Support>('independent');
  const [closeConfirm, setCloseConfirm] = useState(false);
  const [manualInvite, setManualInvite] = useState('');
  const alive = useRef(true);
  const actionAbort = useRef<AbortController | null>(null);
  const chatLog = useRef<HTMLDivElement>(null);
  const previous = useRef<{ revision: number; history: number; complete: boolean; runIndex: number; peer: string | null; ready: boolean; online: boolean; proposalVersion: number } | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const activeRequest = useRef(false);
  const stopPolling = useRef<(() => void) | null>(null);

  function handleLocaleChange(nextLocale: Locale) {
    if (nextLocale === locale) return;
    const url = new URL(window.location.href);
    url.pathname = duoPath(nextLocale);
    writeStorage(browserStorage('sessionStorage'), LANGUAGE_DRAFT_KEY, JSON.stringify({
      path: url.pathname, room: url.searchParams.get('room'), name, gentler,
    }));
    window.location.assign(url.href);
  }

  useEffect(() => {
    alive.current = true;
    const url = new URL(window.location.href);
    const requestedRoom = url.searchParams.get('room') ?? '';
    const secret = new URLSearchParams(url.hash.slice(1)).get('invite');
    // Invitations never remain in the address bar or subsequent browser referrers.
    if (url.hash) { url.hash = ''; window.history.replaceState(window.history.state, '', url.pathname + url.search); }
    if (requestedRoom && secret !== null) {
      if (validDuoSecret(secret)) removeStorage(browserStorage('sessionStorage'), INCOMPLETE_KEY + requestedRoom);
      else writeStorage(browserStorage('sessionStorage'), INCOMPLETE_KEY + requestedRoom, '1');
    }
    const savedPending = requestedRoom ? pendingInvite(requestedRoom) : null;
    const entry = duoEntryChoice({fragment:secret,pending:!!savedPending,tabCredential:readStorage(browserStorage('sessionStorage'),TAB_KEY+requestedRoom),localCredential:readStorage(browserStorage('localStorage'),ROOM_KEY+requestedRoom),acceptedInvite:readStorage(browserStorage('sessionStorage'),ACCEPTED_KEY+requestedRoom),incomplete:readStorage(browserStorage('sessionStorage'),INCOMPLETE_KEY+requestedRoom)==='1'});
    const pending = !entry.pending ? null : requestedRoom && validDuoSecret(secret)
      ? savedPending?.secret === secret ? savedPending : { roomId: requestedRoom, secret }
      : entry.pending ? savedPending : null;
    if (pending) {
      setInvite(pending);
      if (pending.name) setName(pending.name);
      writeStorage(browserStorage('sessionStorage'), PENDING_KEY + requestedRoom, JSON.stringify(pending));
    }
    const savedToken = requestedRoom ? entry.credential : null;
    if (savedToken) {
      setRoomId(requestedRoom); setToken(savedToken); setInvite(null);
      writeStorage(browserStorage('sessionStorage'), TAB_KEY + requestedRoom, savedToken);
      setInviteSecret(readStorage(browserStorage('sessionStorage'), INVITE_KEY + requestedRoom) ?? '');
    } else if (requestedRoom && !pending) {
      setError('This link has no invitation on this device. Ask your friend for the complete invitation link.');
    }
    setPreviousRoom(readStorage(browserStorage('localStorage'), LAST_KEY) ?? '');
    const storage = browserStorage('sessionStorage');
    const draft = readStorage(storage, LANGUAGE_DRAFT_KEY);
    removeStorage(storage, LANGUAGE_DRAFT_KEY);
    if (draft) {
      try {
        const form = JSON.parse(draft);
        if (form.path === url.pathname && form.room === url.searchParams.get('room')) {
          if (typeof form.name === 'string') setName(form.name.slice(0, 24));
          if (typeof form.gentler === 'boolean') setGentler(form.gentler);
        }
      } catch { /* A stale draft cannot block entry. */ }
    }
    // A slow first load can let someone type before React attaches; keep what they typed.
    const typed = nameInput.current?.value.trim();
    if (typed) setName(current => current || typed);
    setHydrated(true);

    return () => { alive.current = false; actionAbort.current?.abort(); };
  }, []);

  const endLocally = useCallback(() => {
    terminalRef.current = true; actionAbort.current?.abort(); setTerminal(true); setVoiceActive(false); setConnection('offline'); setError('');
  }, []);

  const acceptSnapshot = useCallback((next: Snapshot) => {
    if (terminalRef.current) return;
    if (previous.current && next.revision < previous.current.revision) return;

    latestSnapshot.current = next;
    setSnapshot(current => current && current.revision > next.revision ? current : next);
    setConnection('online');
    const recoveredError = pollingError.current; pollingError.current = null;
    setError(current => current === CONNECTION_ERROR || current === recoveredError ? '' : current);
    const prior = previous.current;
    const newRun = !!prior && prior.runIndex !== next.runIndex;

    if (newRun) { setResidence('together'); setSupport('independent'); setChat(''); setAnnouncement('You both agreed to replay. A new story begins.');  }
    else if (prior && !prior.peer && next.partner) { setNotice(''); setManualInvite(''); setAnnouncement(`${next.partner.name} joined your room.`); }
    else if (prior && !prior.ready && next.partner?.ready) setAnnouncement('Your friend is ready to begin.');
    else if (prior?.online && next.partner && !next.partner.online) setAnnouncement('Your friend is away. Their place and saved choices are safe.');
    else if (prior && !prior.online && next.partner?.online) setAnnouncement('Your friend is back in the room.');
    else if (prior && next.proposalVersion > prior.proposalVersion && next.proposal) setAnnouncement('A new shared plan is ready to review.');
    previous.current = { revision: next.revision, history: next.history.length, complete: next.phase === 'complete', runIndex: next.runIndex, peer: next.partner?.id ?? null, ready: !!next.partner?.ready, online: !!next.partner?.online, proposalVersion: next.proposalVersion };
  }, []);

  useEffect(() => {
    setInvitePreviewError('');
    if (!invite) { setInviterName(''); return; }
    const controller = new AbortController();
    setInviterName('');
    void api<{ inviterName: string }>(`/${encodeURIComponent(invite.roomId)}/preview`, { inviteSecret: invite.secret, ...(invite.admissionCredential ? { admissionCredential: invite.admissionCredential } : {}) }, undefined, controller.signal, undefined, 'preview')
      .then(result => { if (!controller.signal.aborted) setInviterName(result.inviterName); })
      .catch(cause => { if (!controller.signal.aborted) {  setInviterName(''); setInvitePreviewError(cause instanceof Error ? cause.message : 'Invitation preview unavailable. You can try joining below.'); } });
    return () => controller.abort();
  }, [invite]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 8_000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!announcement) return;
    const timer = setTimeout(() => setAnnouncement(''), 8_000);
    return () => clearTimeout(timer);
  }, [announcement]);

  useEffect(() => {
    if (!roomId || !token || terminal || snapshot?.phase === 'closed') return;
    const conditional: { etag?: string } = {};
    const poller = startDuoPolling({
      request: async signal => {
        const next = await api<Snapshot | null>(`/${encodeURIComponent(roomId)}`, undefined, token, signal, conditional);
        if (!signal.aborted) {
          if (next) acceptSnapshot(next);
          else {  setConnection('online'); const recoveredError = pollingError.current; pollingError.current = null; setError(current => current === CONNECTION_ERROR || current === recoveredError ? '' : current); }
        }
      },
      failure: cause => {  if (isDuoTerminalError(cause)) { endLocally(); return; } setConnection('offline'); pollingError.current = cause instanceof Error && !(cause instanceof TypeError) ? cause.message : CONNECTION_ERROR; setError(pollingError.current); },
      isHidden: () => document.visibilityState === 'hidden',
      isVoiceActive: () => voiceActiveRef.current,
    });
    stopPolling.current = poller.stop;
    const wake = () => poller.wake();
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('focus', wake);
    window.addEventListener('online', wake);
    return () => {
      poller.stop();
      if (stopPolling.current === poller.stop) stopPolling.current = null;
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('focus', wake);
      window.removeEventListener('online', wake);
    };
  }, [roomId, token, retry, terminal, endLocally, acceptSnapshot, snapshot?.phase === 'closed']);

  useEffect(() => {
    const log = chatLog.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [snapshot?.messages.length]);

  function enterRoom(data: Admission) {
    terminalRef.current = false; setTerminal(false);
    const id = data.snapshot.roomId;
    if (latestSnapshot.current?.roomId !== id) { previous.current = null;  latestSnapshot.current = null; }
    const persisted = writeStorage(browserStorage('localStorage'), ROOM_KEY + id, data.credential);
    writeStorage(browserStorage('sessionStorage'), TAB_KEY + id, data.credential);
    writeStorage(browserStorage('localStorage'), LAST_KEY, id);
    if (data.inviteSecret) { writeStorage(browserStorage('sessionStorage'), INVITE_KEY + id, data.inviteSecret); setInviteSecret(data.inviteSecret); }
    removeStorage(browserStorage('sessionStorage'), PENDING_KEY + id);
    removeStorage(browserStorage('sessionStorage'), INCOMPLETE_KEY + id);
    const url = new URL(window.location.href); url.searchParams.set('room', id); url.hash = '';
    window.history.replaceState(window.history.state, '', url.pathname + url.search);
    setRoomId(id); setToken(data.credential); setInvite(null); acceptSnapshot(data.snapshot);
    if (!persisted) setNotice('This browser blocked local storage. Keep this tab open; refresh may lose access to your character.');
  }

  async function admit(join: boolean) {
    if (activeRequest.current || name.trim().length < 1 || (join && !invite)) return;
    activeRequest.current = true; setBusy(true); setError(''); setNotice('');
    actionAbort.current = new AbortController();
    try {
      let pending = invite;
      if (join && pending) {
        // Retain the actor key before admission: a lost response must not burn the invitation.
        const credential = pending.admissionCredential ?? admissionCredential();
        pending = { ...pending, admissionCredential: credential, name: name.trim() };
        if (!writeStorage(browserStorage('sessionStorage'), PENDING_KEY + pending.roomId, JSON.stringify(pending)) ||
            !writeStorage(browserStorage('sessionStorage'), TAB_KEY + pending.roomId, credential)) {
          throw new DuoRequestError(0, 'storage_unavailable', 'This browser blocked session storage. Allow storage for this site or use another browser before joining, so your place can be recovered if the connection drops.');
        }
        writeStorage(browserStorage('localStorage'), ROOM_KEY + pending.roomId, credential);
        setInvite(pending);
      }
      const data = await api<Admission>(join ? `/${encodeURIComponent(pending!.roomId)}/join` : '', join ? { name: name.trim(), inviteSecret: pending!.secret, admissionCredential: pending!.admissionCredential } : { name: name.trim(), gentler }, undefined, actionAbort.current.signal, undefined, 'admission');
      if (alive.current) {
        if (join && pending) writeStorage(browserStorage('sessionStorage'), ACCEPTED_KEY + pending.roomId, pending.secret);
        enterRoom(data);

      }
    } catch (cause) { if (alive.current && !actionAbort.current.signal.aborted) {  setError(cause instanceof Error ? cause.message : 'Could not open the room. Try again.'); } }
    finally { activeRequest.current = false; if (alive.current) setBusy(false); }
  }

  async function command(action: Command) {
    if (!snapshot || terminalRef.current || activeRequest.current) return false;
    activeRequest.current = true; setBusy(true); setError('');
    actionAbort.current = new AbortController();
    try {
      const payload = duoCommandPayload(action, snapshot, commandId());
      const signal = actionAbort.current.signal;
      const send = () => api<Snapshot>(`/${encodeURIComponent(roomId)}/command`, payload, token, signal);
      let next: Snapshot;
      try {
        next = await send();
      } catch (cause) {
        if (signal.aborted || !(cause instanceof DuoTimeoutError || cause instanceof TypeError) ||
          action.kind === 'life-advance' && action.automatic) throw cause;
        // The first write may have committed. Its receipt makes this retry safe.
        next = await send();
      }
      if (alive.current) {
        acceptSnapshot(next);

        if (action.kind === 'chat') setChat('');
      }
      return true;
    } catch (cause) { if (alive.current && !actionAbort.current.signal.aborted) {  if (isDuoTerminalError(cause)) { endLocally(); return false; }
      // Both friends may press Continue for the same year; losing that race is not an error.
      if (action.kind === 'life-advance' && cause instanceof DuoRequestError && cause.classification === 'stale_clock') { setNotice(`${snapshot.partner?.name ?? 'Your friend'} moved the year forward first. Here is the latest moment.`); setRetry(value => value + 1); return false; }
      setError(cause instanceof Error ? cause.message : 'Could not save. Please try again.'); setRetry(value => value + 1); } return false; }
    finally { activeRequest.current = false; if (alive.current) setBusy(false); }
  }

  function invitationPayload() {
    return duoInvitationShare(snapshot?.self.name ?? name, window.location.origin, roomId, inviteSecret, locale);
  }
  async function copyInvite() {
    if (!inviteSecret) return;
    const invitation = invitationPayload();
    try { await navigator.clipboard.writeText(invitation.copyText); setNotice('Invitation copied. Send it privately to your friend.'); setManualInvite('');  }
    catch { setManualInvite(invitation.url); setNotice('Select and copy your private invitation below.'); }
  }
  async function shareInvite() {
    if (!inviteSecret) return;
    if (navigator.share) {
      try { const { title, text, url } = invitationPayload(); await navigator.share({ title, text, url });  return; }
      catch (cause) { if (cause instanceof Error && cause.name === 'AbortError') return; }
    }
    await copyInvite();
  }
  async function renewInvite() {
    if (activeRequest.current) return;
    activeRequest.current = true; setBusy(true); setError('');
    actionAbort.current = new AbortController();
    try {
      const data = await api<{ inviteSecret: string; snapshot: Snapshot }>(`/${encodeURIComponent(roomId)}/invite`, {}, token, actionAbort.current.signal, undefined, 'invitation');
      if (!alive.current) return;
      writeStorage(browserStorage('sessionStorage'), INVITE_KEY + roomId, data.inviteSecret);
      setInviteSecret(data.inviteSecret); setManualInvite(''); acceptSnapshot(data.snapshot);
      setNotice('Fresh invitation ready. The previous link will no longer work.');
    } catch (cause) { if (alive.current && !actionAbort.current.signal.aborted) {  if (isDuoTerminalError(cause)) endLocally(); else setError(cause instanceof Error ? cause.message : 'Could not refresh the invitation. Try again.'); } }
    finally { activeRequest.current = false; if (alive.current) setBusy(false); }
  }
  function returnToRoom() {
    terminalRef.current = false; setTerminal(false);
    const credential = readStorage(browserStorage('sessionStorage'), TAB_KEY + previousRoom) ?? readStorage(browserStorage('localStorage'), ROOM_KEY + previousRoom);
    if (!credential) { setError('The saved character key is unavailable on this device. Create a new room.'); return; }
    const url = new URL(window.location.href); url.searchParams.set('room', previousRoom); url.hash = '';
    window.history.replaceState(window.history.state, '', url.pathname + url.search);
    setRoomId(previousRoom); setToken(credential); setInviteSecret(readStorage(browserStorage('sessionStorage'), INVITE_KEY + previousRoom) ?? ''); setError('');
  }
  function returnToInvitationCharacter() {
    if (!invite) return;
    const credential = readStorage(browserStorage('sessionStorage'), TAB_KEY + invite.roomId);
    if (!validDuoSecret(credential)) return;
    terminalRef.current = false; setTerminal(false); setRoomId(invite.roomId); setToken(credential); setInvite(null); setError('');
    setInviteSecret(readStorage(browserStorage('sessionStorage'), INVITE_KEY + invite.roomId) ?? '');
  }
  function leaveRoom() {
    stopPolling.current?.();
    const wasTerminal = terminalRef.current || snapshot?.phase === 'closed';
    if (wasTerminal && readStorage(browserStorage('localStorage'), LAST_KEY) === roomId) {
      removeStorage(browserStorage('localStorage'), LAST_KEY);
    }
    terminalRef.current = false; setTerminal(false);
    actionAbort.current?.abort();  latestSnapshot.current = null; setSnapshot(null); setRoomId(''); setToken(''); setError(''); setNotice(''); setManualInvite(''); setVoiceActive(false); setConnection('connecting'); setInvite(null); setInviteSecret(''); setCloseConfirm(false); previous.current = null;
    window.history.replaceState(window.history.state, '', duoPath(locale));
    setPreviousRoom(readStorage(browserStorage('localStorage'), LAST_KEY) ?? '');
  }
  function focusEntry() {
    const input = nameInput.current;
    input?.scrollIntoView({ behavior: 'instant', block: 'center' });
    input?.focus({ preventScroll: true });
  }
  function downloadRecap() {
    if (!snapshot) return;
    const text = ['1in8bn — A life, together', 'A fictional, shared life simulation.', '', `My character: ${snapshot.self.name}`, ...snapshot.history.flatMap(item => [`Age ${item.age}`, `${RESIDENCE[item.residence]} · ${SUPPORT[item.support]}`, item.summary, '']), `My final resources: ${snapshot.self.life.money}`, `My work: ${snapshot.self.life.job}`, `My wellbeing: ${snapshot.self.life.wellbeing}/100`, '', 'Play for free: https://1in8bn.com/together/'].join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = '1in8bn-together-my-story.txt'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const stage = CHAPTERS[Math.min(2, snapshot?.stage ?? 0)];
  const self = snapshot?.self;
  const peer = snapshot?.partner;
  const connected = connection === 'online';
  const ownPause = !!snapshot?.pausedBy.includes(snapshot.self.id);
  const canPlan = !terminal && !!snapshot && snapshot.phase === 'planning' && !snapshot.paused && !!peer?.online && connected && !busy;
  const approved = !!snapshot?.proposal?.approvals.includes(snapshot.self.id);
  const proposal = snapshot?.proposal;
  const inviteExpired = !!snapshot?.invitation.expiresAt && snapshot.invitation.expiresAt <= Date.now();
  const replayVoted = !!snapshot?.replayVotes.includes(snapshot.self.id);

  if (snapshot?.lifetime) return <DuoLifetime locale={locale} snapshot={snapshot} roomId={roomId} token={token} busy={busy} connected={connected} terminal={terminal} error={error} notice={notice} announcement={announcement} command={command} shareInvite={shareInvite} renewInvite={renewInvite} inviteAvailable={!!inviteSecret && !inviteExpired} manualInvite={manualInvite} onVoice={setVoiceActive} leave={leaveRoom} reconnect={() => { setError(''); setConnection('connecting'); setRetry(value => value + 1); }}/>;

  return <main className="duo-page">
    <div className="duo-wrap">
      <header className="duo-header">
        <a className="identity-wordmark" href={localePath(locale)}><img src="/icon.svg?v=passport2" alt="" width="32" height="32"/><span>1in8bn</span><small>A life, together</small></a>
        <div className="duo-header-actions">{!roomId && <><DuoLocaleMenu locale={locale} onChange={handleLocaleChange}/><DuoThemeToggle/></>}<a className="duo-back" href={localePath(locale)}><ArrowLeft size={15}/> {copy.soloLink}</a></div>
      </header>
      {error && <div className="duo-alert duo-error" role="alert"><span>{error}</span>{roomId && !terminal && <button type="button" onClick={() => { setError(''); setConnection('connecting'); setRetry(value => value + 1); }}><RefreshCw size={15}/> Reconnect</button>}<button className="duo-icon-button" aria-label="Dismiss error" onClick={() => setError('')}><X size={16}/></button></div>}
      {notice && <div className="duo-alert" role="status"><span>{notice}</span><button className="duo-icon-button" aria-label="Dismiss notice" onClick={() => setNotice('')}><X size={16}/></button></div>}
      <div className="duo-sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
      {terminal && <div className="duo-alert" role="status"><span>This room has ended or expired. Voice has stopped. Your last observed story stays on this page so you can save it.</span></div>}
      {!roomId && <>
        <section className={`duo-intro ${invite ? 'duo-invited' : ''}`}>
          <div className="duo-intro-copy">
            <p className="duo-eyebrow"><span/> {copy.subtitle}</p>
            <h1>{copy.title1}<br/><em>{copy.title2}</em></h1>
            <button className="duo-primary duo-hero-start" type="button" onClick={focusEntry}>
              <Users size={18} aria-hidden="true"/>{invite ? copy.heroAccept : copy.heroCta}<ArrowRight size={17} aria-hidden="true"/>
            </button>
            <p className="duo-lead">{copy.lead}</p>
            <p className="duo-intro-note">{copy.introNote}</p>
            <div className="duo-facts dlp-chips">
              <span><Users size={14} aria-hidden="true"/>{copy.chipPlayers}</span>
              <span><Sprout size={14} aria-hidden="true"/>{copy.chipSpan}</span>
              <span><Mic size={14} aria-hidden="true"/>{copy.chipVoice}</span>
              <span><Heart size={14} aria-hidden="true"/>{copy.chipFree}</span>
            </div>
            <PoweredByAgora />
          </div>
          <div className="duo-entry-paper" id="duo-start">
            <DuoRoomSceneVertical/>
            <div className="duo-entry-form" id="duo-entry-form">
              <p className="duo-eyebrow">{invite ? copy.yourPlaceWaiting : copy.pullUpChair}</p>
              <h2>{invite ? inviterName ? `${inviterName} ${copy.invitedYou}` : copy.haveInvitation : copy.startWithName}</h2>
              <p>{invite ? copy.joinExplain : copy.createExplain}</p>
              {invitePreviewError && <p className="duo-invite-error" role="status">{invitePreviewError}</p>}
              <form onSubmit={(e: FormEvent) => { e.preventDefault(); void admit(!!invite); }}>
                <label htmlFor="duo-name">{copy.yourNameLabel}</label>
                <input id="duo-name" ref={nameInput} value={name} onChange={e => setName(e.target.value)} maxLength={24} placeholder={copy.namePlaceholder} autoComplete="off" required/>
                {!invite && <div className="duo-mortality">
                  <DuoSelect label={copy.uncertaintyLabel} value={gentler ? 'gentle' : 'classic'} onChange={value => setGentler(value === 'gentle')}
                    options={[{ value: 'gentle', label: copy.gentleLabel }, { value: 'classic', label: copy.classicLabel }]}/>
                  <small>{copy.uncertaintyHint}</small>
                </div>}
                <button className="duo-primary" disabled={!hydrated || busy || !name.trim()}>
                  {busy ? <LoaderCircle size={18} className="duo-spin"/> : invite ? <Users size={18}/> : <Link2 size={18}/>} {busy ? copy.openingRoom : invite ? copy.joinRoomBtn : copy.createRoomBtn}{!busy && <ArrowRight size={18}/>}
                </button>
              </form>
              {invite && validDuoSecret(readStorage(browserStorage('sessionStorage'), TAB_KEY + invite.roomId)) && <button className="duo-text-button" onClick={returnToInvitationCharacter}>{copy.returnSavedChar}</button>}
              {invite && <button className="duo-text-button" onClick={() => { setInvite(null); removeStorage(browserStorage('sessionStorage'), PENDING_KEY + invite.roomId); window.history.replaceState(window.history.state, '', duoPath(locale)); }}>{copy.createOwnInstead}</button>}
              {previousRoom && !invite && <button className="duo-text-button" onClick={returnToRoom}><RefreshCw size={14}/> {copy.returnSavedRoom}</button>}
              <p className="duo-small"><LockKeyhole size={13}/> {copy.securityNote}</p>
            </div>
          </div>
        </section>
        <DuoLandingSections onStart={focusEntry} copy={copy}/>
      </>}
      {roomId && !snapshot && <section className="duo-loading" aria-live="polite">{!terminal && connection !== 'offline' && <LoaderCircle size={30} className="duo-spin"/>}<h1>{terminal ? 'This room is no longer available.' : connection === 'offline' ? 'Connection interrupted' : 'Finding your place…'}</h1><p>{terminal ? 'Start a new story when you are both ready.' : connection === 'offline' ? 'Reconnect to return to your saved character.' : 'Your character is being reconnected to the room.'}</p><button onClick={leaveRoom}>Back to the beginning</button></section>}
      {snapshot && self && <>
        <div className="duo-room-heading"><div><p className="duo-eyebrow">LEGACY THREE-CHAPTER STORY / {snapshot.phase === 'complete' ? 'THE STORY SO FAR' : 'YOUR PRIVATE ROOM'}</p><h1>{terminal ? 'Your saved story remains.' : snapshot.phase === 'complete' ? 'This is what you built.' : snapshot.phase === 'waiting' ? peer ? `${peer.online ? 'Both here' : 'Friend joined · away'} · ${Number(self.ready) + Number(peer.ready)}/2 ready` : 'Your room is ready. Invite a friend.' : stage.name}</h1></div><div className="duo-connection"><span className={connected ? 'duo-dot online' : 'duo-dot'}/>{terminal ? 'Room ended' : connected ? 'Room connected' : connection === 'connecting' ? 'Reconnecting…' : 'Connection interrupted'}</div></div>
        {snapshot.phase !== 'waiting' && <nav className="duo-chapters" aria-label="Story chapters">{CHAPTERS.map((chapter, index) => <div key={chapter.name} className={`${index === snapshot.stage ? 'current' : ''} ${index < snapshot.history.length ? 'done' : ''}`} aria-current={index === snapshot.stage ? 'step' : undefined}><span>{index < snapshot.history.length ? <Check size={15}/> : `0${index + 1}`}</span><div><strong>{chapter.name}</strong><small>Age {20 + index * 5}</small></div></div>)}</nav>}
        {!terminal && snapshot.phase !== 'complete' && snapshot.phase !== 'closed' && snapshot.phase !== 'waiting' && <div className="duo-session-tools"><span>{snapshot.paused ? <><Pause size={14}/> {peer && !peer.online ? 'Your friend is away. Waiting for them to reconnect.' : 'The story is paused.'}</> : <><LockKeyhole size={14}/> Your private choices stay on your side.</>}</span><button disabled={busy || !connected} onClick={() => void command({ kind: ownPause ? 'resume' : 'pause' })}>{ownPause ? <Play size={14}/> : <Pause size={14}/>} {ownPause ? 'I’m back · Resume' : 'Pause for me'}</button><button onClick={() => setCloseConfirm(!closeConfirm)}><X size={14}/> End session</button></div>}
        {!terminal && closeConfirm && <div className="duo-alert duo-error"><span>{peer ? 'End this room for both people? Saved chapter recaps remain visible, but this room cannot be played again.' : 'Cancel this private invitation and close the room? The invitation will stop working.'}</span><button disabled={busy} onClick={() => { void command({ kind: 'close' }).then(ok => { if (ok) setCloseConfirm(false); }); }}>{peer ? 'End for both' : 'Close my room'}</button><button onClick={() => setCloseConfirm(false)}>Keep playing</button></div>}
        <div className="duo-play-layout"><section className="duo-story-column">
          {!terminal && snapshot.phase === 'waiting' && <div className="duo-paper duo-waiting"><p className="duo-eyebrow">BEFORE THE FIRST CHAPTER</p><h2>{peer ? `${Number(self.ready) + Number(peer.ready)}/2 ready to begin` : 'Invite your person.'}</h2><p>{peer ? 'You each choose when you are ready. Your story begins when both people are here and ready.' : 'Share this private invitation with one friend. You can switch to your messaging app, then return to this tab. Your room will be waiting.'}</p>{!peer && inviteSecret && !inviteExpired && <div className="duo-invite-actions"><button className="duo-primary" onClick={() => void shareInvite()}><Share2 size={18}/> Share invitation</button><button className="duo-text-button" onClick={() => void copyInvite()}><Copy size={16}/> Copy invitation</button></div>}{!peer && inviteExpired && <p className="duo-small">This invitation expired. Create a fresh link before sharing.</p>}{!peer && snapshot.invitation.canRenew && (inviteExpired || !inviteSecret) && <button className="duo-primary" disabled={busy || !connected} onClick={() => void renewInvite()}><RefreshCw size={17}/> Create fresh invitation</button>}{!peer && !inviteSecret && !snapshot.invitation.canRenew && <p className="duo-small">Only the room creator can refresh the invitation.</p>}{manualInvite && !peer && <label className="duo-manual-link">Private invitation<input readOnly value={manualInvite} onFocus={e => e.target.select()}/></label>}{peer && <div className="duo-lobby-presence"><span><span className={`duo-dot ${peer.online ? 'online' : ''}`}/>{peer.name} · {peer.ready ? 'Ready ✓' : 'Not ready yet'}{!peer.online && ' · Away'}</span><span>You · {self.ready ? 'Ready ✓' : 'Not ready yet'}</span></div>}<div className="duo-ready-row"><span>{self.ready ? <CheckCheck size={17}/> : <Users size={17}/>} {self.ready ? 'Your readiness is saved.' : 'Take your time. Choose when you are ready.'}</span><button className="duo-primary" disabled={busy || !connected || self.ready} onClick={() => void command({ kind: 'ready' })}>{self.ready ? 'Ready ✓' : 'I’m ready'}</button></div><p className="duo-small">No account needed. Keep this browser to return to your character. Rooms expire after 24 hours.</p><button className="duo-text-button" onClick={() => setCloseConfirm(true)}>{peer ? 'End this room' : 'Cancel this room'}</button></div>}
          {snapshot.phase !== 'waiting' && (self.origin || peer?.origin) && <div className="duo-origin-strip" aria-label="Our starting places"><span><small>{self.name}</small><strong>{self.origin?.countryName ?? 'Starting place not recorded'}</strong></span><span><small>{peer?.name ?? 'Your friend'}</small><strong>{peer?.origin?.countryName ?? 'Starting place not recorded'}</strong></span><p>Two independently drawn birthplaces. Starting resources are fictional.</p></div>}
          {snapshot.phase !== 'complete' && snapshot.phase !== 'closed' && !terminal && <DuoRoomScene names={[self.name, peer?.name ?? 'A place for someone']} seeds={[seedFor(self.id), peer ? seedFor(peer.id) : null]} age={snapshot.age} stage={snapshot.stage}/>}
          {!terminal && snapshot.phase === 'planning' && <div className="duo-paper duo-choices"><p className="duo-eyebrow">{stage.subtitle}</p><h2>First, your own next step.</h2><p>{stage.prompt}</p><p className="duo-small"><LockKeyhole size={13}/> Your friend sees that you chose, not which option you picked.</p><div className="duo-choice-list">{snapshot.personalOptions.map(choice => <button key={choice.id} className={self.personalChoice === choice.id ? 'selected' : ''} disabled={!canPlan || !!proposal} onClick={() => void command({ kind: 'personal', choice: choice.id })} aria-pressed={self.personalChoice === choice.id}><span className="duo-choice-symbol">{CHOICES.find(option => option.id === choice.id)?.icon ?? '✦'}</span><span><strong>{choice.label}</strong><small className="duo-choice-effects">{choice.moneyDelta >= 0 ? '+' : '−'}{Math.abs(choice.moneyDelta).toLocaleString('en-US')} credits · {choice.wellbeingDelta >= 0 ? '+' : '−'}{Math.abs(choice.wellbeingDelta)} wellbeing</small><small>{choice.description}</small></span>{self.personalChoice === choice.id && <Check size={18}/>}</button>)}</div>{self.personalChoice && <p className="duo-saved"><Check size={14}/> Personal choice saved. {proposal ? 'Withdraw the shared plan to change this choice.' : 'You may revise it until a shared plan is proposed.'}</p>}</div>}
          {!terminal && snapshot.phase === 'planning' && <div className="duo-paper duo-proposal"><p className="duo-eyebrow">THE DECISION YOU SHARE</p><h2>How do we make this work?</h2><p>Choose the terms you can accept. Sending a plan records your agreement; your friend must also confirm before it takes effect.</p><details className="duo-terms"><summary>Read the shared costs and commitments</summary><p><strong>Housing:</strong> {snapshot.sharedTerms.residence}</p><p><strong>Resources:</strong> {snapshot.sharedTerms.support}</p></details><div className="duo-proposal-fields"><div className="duo-plan-group" role="group" aria-label="Where will we live?"><h3>Where will we live?</h3><div className="duo-plan-options housing"><button type="button" className={residence === 'together' ? 'selected' : ''} aria-pressed={residence === 'together'} disabled={!canPlan} onClick={() => setResidence('together')}><strong>Live together</strong><small>3,000 credits each</small></button><button type="button" className={residence === 'apart' ? 'selected' : ''} aria-pressed={residence === 'apart'} disabled={!canPlan} onClick={() => setResidence('apart')}><strong>Separate homes</strong><small>6,000 credits each</small></button></div></div><div className="duo-plan-group" role="group" aria-label="How will we handle resources?"><h3>How will we handle resources?</h3><div className="duo-plan-options resources"><button type="button" className={support === 'independent' ? 'selected' : ''} aria-pressed={support === 'independent'} disabled={!canPlan} onClick={() => setSupport('independent')}><strong>Independent</strong><small>Keep our own balances</small></button><button type="button" className={support === 'share' ? 'selected' : ''} aria-pressed={support === 'share'} disabled={!canPlan} onClick={() => setSupport('share')}><strong>Share equally</strong><small>Pool balances and debt</small></button><button type="button" className={support === 'support-partner' ? 'selected' : ''} aria-pressed={support === 'support-partner'} disabled={!canPlan} onClick={() => setSupport('support-partner')}><strong>I offer support</strong><small>Give up to 2,000 credits</small></button></div></div></div><div className="duo-draft-terms"><strong>You are agreeing to: {RESIDENCE[residence]} · {SUPPORT[support]}.</strong><p>{snapshot.sharedTerms.residence}</p><p>{snapshot.sharedTerms.support}</p></div><button className="duo-secondary" disabled={!canPlan || !self.personalChoice || !peer?.personalChosen} onClick={() => void command({ kind: 'propose', residence, support, proposalVersion: snapshot.proposalVersion, agree: true })}><HeartHandshake size={17}/> {proposal ? 'Send and agree to this revised plan' : 'Send and agree to this plan'}</button>{(!self.personalChoice || !peer?.personalChosen) && <p className="duo-small">Both people choose a personal next step before proposing a shared plan.</p>}{proposal && <div className="duo-current-proposal"><div className="duo-proposal-title"><strong>Plan {proposal.version}</strong><span>{proposal.proposerId === self.id ? 'Proposed by you' : 'Proposed by your friend'}</span></div><p>{RESIDENCE[proposal.residence]}<br/>{proposal.support === 'support-partner' ? `${proposal.proposerId === self.id ? 'You offer' : 'Your friend offers'} support to the other person` : SUPPORT[proposal.support]}</p><p className="duo-plan-terms">{proposal.residence === 'together' ? 'Housing: 3,000 life credits each.' : 'Housing: 6,000 life credits each.'} {proposal.support === 'share' ? 'Both full balances after costs, including debt, are pooled and split equally.' : proposal.support === 'support-partner' ? 'The proposer transfers up to 2,000 available life credits to the other person.' : 'Each person keeps their own balance; no transfer.'}</p><div className="duo-approval-status"><span>{approved ? <CheckCheck size={16}/> : <span className="duo-empty-check"/>} You {approved ? 'confirmed' : 'have not confirmed'}</span><span>{proposal.approvals.some(id => id !== self.id) ? <CheckCheck size={16}/> : <span className="duo-empty-check"/>} Your friend {proposal.approvals.some(id => id !== self.id) ? 'confirmed' : 'has not confirmed'}</span></div><button className={approved ? 'duo-secondary' : 'duo-primary'} disabled={!canPlan} onClick={() => void command({ kind: approved ? 'withdraw' : 'approve', proposalVersion: proposal.version })}>{approved ? 'Withdraw this plan' : 'I agree to this plan'}{!approved && <Check size={17}/>}</button>{!approved && <button className="duo-text-button" disabled={busy || !connected} onClick={() => void command({ kind: 'withdraw', proposalVersion: proposal.version })}>Withdraw this shared plan</button>}<p className="duo-small">A revision clears both confirmations. Your story advances only when both people confirm this exact plan.</p></div>}</div>}
          {(terminal || snapshot.phase === 'review' || snapshot.phase === 'complete' || snapshot.phase === 'closed') && <div className="duo-paper duo-recap"><p className="duo-eyebrow">{!terminal && snapshot.phase === 'review' ? 'A CHAPTER, WRITTEN TOGETHER' : 'YOUR PERSONAL KEEPSAKE'}</p><h2>{terminal ? 'The last story saved on this device.' : snapshot.phase === 'review' ? 'Here is where your choices led.' : snapshot.phase === 'closed' ? 'The room has been closed.' : 'Two people. One shared chapter of life.'}</h2>{!terminal && snapshot.phase === 'complete' && <div className="duo-replay"><button className="duo-primary" disabled={busy || !connected || replayVoted || !peer?.online} onClick={() => void command({ kind: 'replay' })}><RefreshCw size={17}/>{replayVoted ? 'You agreed · waiting for your friend' : 'Play again together'}</button><p className="duo-small">A new story starts in this room only when both people agree. {snapshot.replayVotes.length}/2 agreed. Your previous personal recap stays below. {!peer?.online && 'Your friend is away; replay becomes available when they return. You can still save and share your own card.'}</p></div>}{snapshot.history.length ? !terminal && snapshot.phase === 'review' ? <ol>{snapshot.history.map((item, index) => <li key={`${item.age}-${index}`}><span>AGE {item.age}</span><h3>{RESIDENCE[item.residence]}</h3><p>{item.summary}</p></li>)}</ol> : <details className="duo-story-details"><summary>Read my chapter-by-chapter story</summary><ol>{snapshot.history.map((item, index) => <li key={`${item.age}-${index}`}><span>AGE {item.age}</span><h3>{RESIDENCE[item.residence]}</h3><p>{item.summary}</p></li>)}</ol></details> : <p>The session ended before a chapter was completed.</p>}{!terminal && snapshot.phase === 'review' ? <><p className="duo-small">Read your own outcome. Your friend sees their own side of the story.</p><button className="duo-primary" disabled={busy || !connected || snapshot.paused || self.continued || !peer?.online} onClick={() => void command({ kind: 'continue' })}>{self.continued ? 'Waiting for your friend…' : snapshot.stage === 2 ? 'Finish our story' : 'Ready for the next chapter'}<ArrowRight size={17}/></button></> : <><DuoKeepsake snapshot={snapshot}/><div className="duo-recap-actions"><button className="duo-secondary" onClick={downloadRecap}><Download size={16}/> Download text backup</button><button className="duo-text-button" onClick={leaveRoom}>Back to the beginning</button></div></>}</div>}
          {self.archives.length > 0 && <details className="duo-paper duo-archives"><summary>Previous personal stories ({self.archives.length})</summary>{self.archives.map(archive => <section key={archive.runIndex}><h3>Story {archive.runIndex + 1}</h3>{archive.history.map(item => <p key={item.age}>{item.summary}</p>)}</section>)}</details>}
        </section><aside className="duo-side-column">
          <section className="duo-paper duo-character"><p className="duo-eyebrow">YOUR SIDE OF THE STORY</p><div className="duo-person"><div className="duo-portrait-frame"><Portrait seed={seedFor(self.id)} age={snapshot.age}/></div><div><h2>{self.name}</h2><p>Age {snapshot.age} · Your character</p></div></div><dl className="duo-stats">{self.origin && <div><dt>Birthplace</dt><dd>{self.origin.countryName}</dd></div>}{self.start && <div><dt>Starting point</dt><dd>{self.start.description}</dd></div>}<div><dt>Resources</dt><dd>{Math.round(self.life.money).toLocaleString('en-US')} <small>credits</small></dd></div><div><dt>Work</dt><dd>{self.life.job}</dd></div><div><dt>Wellbeing</dt><dd>{Math.round(self.life.wellbeing)}<small> / 100</small></dd></div></dl><div className="duo-wellbeing" role="meter" aria-label="Your wellbeing" aria-valuenow={self.life.wellbeing} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.max(0, Math.min(100, self.life.wellbeing))}%` }}/></div><p className="duo-small">These are fictional game resources. Your balance and personal choice are not shown directly. Shared plans can reveal their effects.</p></section>
          <section className="duo-paper duo-peer"><p className="duo-eyebrow">THE OTHER CHAIR</p><div className="duo-peer-title"><h2>{peer?.name ?? 'Waiting for someone'}</h2><span className={`duo-dot ${peer?.online ? 'online' : ''}`}/></div><p>{!peer ? 'Your invitation opens this place.' : peer.online ? 'Here with you' : 'Away · progress waits for both of you'}</p>{peer?.origin && <p className="duo-small">Born in {peer.origin.countryName}. {peer.start?.description}</p>}{peer && <div className="duo-peer-flags"><span>{peer.ready ? '✓ Ready to play' : 'Settling in'}</span><span>{peer.personalChosen ? '✓ Personal choice made' : 'Considering their next step'}</span>{snapshot.phase === 'review' && <span>{peer.continued ? '✓ Ready to continue' : 'Reading this chapter'}</span>}</div>}<p className="duo-small">You see their presence and shared commitments. Their personal choices are not shown directly; shared outcomes can reveal their effects.</p></section>
          {!terminal && snapshot.phase !== 'closed' && !!peer && <DuoVoice roomId={roomId} memberToken={token} onActiveChange={setVoiceActive}/>}
          <section className="duo-paper duo-chat"><h2><MessageCircle size={18}/> Between us</h2><p className="duo-small">Room messages stay in this story. Don’t share sensitive information.</p><div className="duo-message-list" ref={chatLog} role="log" aria-label="Room conversation" aria-live="polite">{!snapshot.messages.length && <div className="duo-chat-empty">A small place to talk<br/>about the big decisions.</div>}{snapshot.messages.map(message => <div key={message.id} className={`duo-message ${message.memberId === self.id ? 'mine' : ''}`}><strong>{message.memberId === self.id ? 'You' : message.name}</strong><p>{message.text}</p></div>)}</div><form onSubmit={e => { e.preventDefault(); if (chat.trim()) void command({ kind: 'chat', text: chat.trim() }); }}><label className="duo-sr-only" htmlFor="duo-message">Message your friend</label><input id="duo-message" value={chat} onChange={e => setChat(e.target.value)} maxLength={280} autoComplete="off" placeholder="Say something…" disabled={terminal || snapshot.phase === 'closed'}/><button type="submit" aria-label="Send message" disabled={busy || !connected || !chat.trim() || terminal || snapshot.phase === 'closed'}><Send size={17}/></button></form><small className="duo-chat-limit">{chat.length}/280</small></section>
        </aside></div>
      </>}
      <footer className="duo-footer"><div className="duo-footer-brand"><span>1in8bn · A life, together</span><p>{copy.introNote}</p></div><nav aria-label="More from 1in8bn"><a href={localePath(locale)}>{copy.soloLink}</a><a href="/reference/how-to-play/">How to play</a><a href="/reference/privacy/">Privacy</a><PoweredByAgora  variant="inline"/></nav><small>Use the same browser to return to your character. Rooms expire automatically.</small></footer>
    </div>
  </main>;
}

function DuoRoomScene({ names, seeds, age, stage }: { names: [string, string]; seeds: [number, number | null]; age: number; stage: number }) {
  return <div className={`duo-scene duo-scene-${stage}`} role="img" aria-label={`A shared room with ${names[0]} and ${seeds[1] === null ? 'an empty chair' : names[1]}`}>
    <svg className="duo-scene-room" viewBox="0 0 640 320" aria-hidden="true" preserveAspectRatio="xMidYMid slice"><rect width="640" height="320" fill="#e8dfce"/><path d="M0 0H640V235H0Z" fill="#e8dfce"/><path d="M0 235H640V320H0Z" fill="#d3bda0"/><path d="M0 239H640M0 275H640M0 312H640M90 239V275M350 239V275M180 275V312M500 275V312" stroke="#bca587" strokeWidth="2"/><rect x="225" y="30" width="190" height="150" fill="#48646a"/><rect x="233" y="38" width="174" height="134" fill={stage === 2 ? '#9ab7bd' : '#b1ced0'}/><path d="M233 139L275 108L309 130L355 94L407 119V172H233Z" fill="#748f80"/><circle cx={stage === 2 ? 367 : 271} cy="68" r="15" fill="#f2db9c"/><path d="M320 38V172M233 105H407" stroke="#e9e2d5" strokeWidth="8"/><path d="M218 181H422" stroke="#8f7660" strokeWidth="8"/><rect x="42" y="73" width="78" height="104" fill="#c0ae92"/><rect x="48" y="79" width="66" height="92" fill="#f9f1dc"/><path d="M62 146L83 108L101 146Z" fill="#78978f"/><circle cx="91" cy="99" r="9" fill="#d7ad73"/><path d="M530 229V187M530 209C498 207 502 176 520 190M532 200C560 197 560 170 543 179" stroke="#537d69" strokeWidth="9" fill="none"/><path d="M511 225H550L542 260H519Z" fill="#b86f50"/><path d="M177 207H461V224H177Z" fill="#9e7858"/><path d="M188 224V280M450 224V280" stroke="#815f47" strokeWidth="10"/><path d="M287 202L306 195L335 203L316 209Z" fill="#f5ecd9"/><rect x="346" y="188" width="14" height="16" rx="2" fill="#427983"/><path d="M360 191H366V200H360" fill="none" stroke="#427983" strokeWidth="3"/>{stage > 0 && <><rect x="250" y="187" width="20" height="16" fill="#aa644f"/><path d="M253 187V179H267V187" fill="#eee3ca"/></>}<path d="M119 219H183V231H119Z M128 231V281M173 231V281M119 219V173H128V219" stroke="#6b7f78" strokeWidth="8" fill="none"/><path d="M458 219H522V231H458Z M468 231V281M512 231V281M514 219V173H522V219" stroke="#6b7f78" strokeWidth="8" fill="none"/></svg>
    <div className="duo-scene-person left"><Portrait seed={seeds[0]} age={age}/><span>{names[0]}</span></div>
    {seeds[1] !== null ? <div className="duo-scene-person right"><Portrait seed={seeds[1]} age={age}/><span>{names[1]}</span></div> : <span className="duo-empty-chair">Your friend’s place</span>}
    <span className="duo-scene-caption">{stage === 0 ? 'Every shared life starts somewhere.' : stage === 1 ? 'A little more history. A little more home.' : 'A life shaped by two sets of choices.'}</span>
  </div>;
}
