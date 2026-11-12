import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import type { DuoSnapshot } from '../lib/duo-engine';

export function DuoChat({ messages, self, active, disabled, ended, unread, onRead, send, draft, setDraft }: {
  messages: DuoSnapshot['messages'];
  self: string;
  active: boolean;
  disabled: boolean;
  ended: boolean;
  unread: number;
  onRead(id: string): void;
  send(text: string): Promise<boolean>;
  draft: string;
  setDraft(text: string): void;
}) {
  const log = useRef<HTMLDivElement>(null);
  const atEnd = useRef(true);
  const [inView, setInView] = useState(false);
  const [readingLatest, setReadingLatest] = useState(true);
  const last = messages.at(-1)?.id;

  useEffect(() => {
    if (!active || !log.current) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.intersectionRatio >= .25), { threshold: .25 });
    observer.observe(log.current);
    return () => observer.disconnect();
  }, [active]);

  useLayoutEffect(() => {
    if (active && atEnd.current && log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [active, last]);

  useEffect(() => {
    if (active && inView && readingLatest && last && document.visibilityState !== 'hidden') onRead(last);
    if (!active || !inView || !readingLatest || !last) return;
    const markVisible = () => { if (document.visibilityState !== 'hidden') onRead(last); };
    document.addEventListener('visibilitychange', markVisible);
    return () => document.removeEventListener('visibilitychange', markVisible);
  }, [active, inView, readingLatest, last, onRead]);

  function showLatest() {
    atEnd.current = true;
    setReadingLatest(true);
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }

  return <article className="dl-card dl-chat-card">
    <h1>Between us {unread > 0 && <span className="dl-unread" aria-label={unread + ' unread messages'}>{unread}</span>}</h1>
    <p>Talk about a choice, or simply keep each other company.</p>
    <div ref={log} className="dl-messages" role="log" aria-label="Room messages" tabIndex={0}
      onScroll={event => {
        const el = event.currentTarget;
        atEnd.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
        setReadingLatest(atEnd.current);
      }}>
      {!messages.length && <p className="dl-muted">Say hello to your friend.</p>}
      {messages.map(message => <div className={message.memberId === self ? 'mine' : ''} key={message.id}>
        <strong>{message.memberId === self ? 'You' : message.name}</strong><p>{message.text}</p>
      </div>)}
    </div>
    {!readingLatest && <button type="button" className="dl-chat-jump" onClick={showLatest}>
      {unread > 0 ? unread + ' new · ' : ''}Go to latest
    </button>}
    <form className="dl-chat-form" onSubmit={event => {
      event.preventDefault();
      if (!draft.trim() || disabled) return;
      void send(draft.trim()).then(ok => { if (ok) showLatest(); });
    }}>
      <label className="duo-sr-only" htmlFor="dl-message">Message</label>
      <input id="dl-message" value={draft} onChange={event => setDraft(event.target.value)}
        maxLength={280} disabled={ended} autoComplete="off" placeholder="Say something…"/>
      <button aria-label="Send message" disabled={disabled || !draft.trim()}><Send size={18}/></button>
    </form>
  </article>;
}
