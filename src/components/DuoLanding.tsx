import { useEffect, useState } from 'react';
import { ArrowRight, AudioLines, Check, EyeOff, HeartHandshake, Link2, MessageCircle, Mic, Moon, Sprout, Sun, Users } from 'lucide-react';
import { Portrait } from './Visuals';
import { PoweredByAgora } from './DuoAgora';
import { DUO_FAQ } from '../lib/duo-public';
import type { DuoLandingCopy } from '../lib/duo-i18n';
import './duo-landing.css';

const DEFAULT_STEPS = [
  { icon: Link2, title: 'Create a room', text: 'Pick a nickname and the kind of uncertainty you want. No account, no download.' },
  { icon: Users, title: 'Send one private link', text: 'The invitation is for one person. When your friend joins, both seats are filled.' },
  { icon: Sprout, title: 'Live two whole lives', text: 'Each of you is born somewhere different and grows from first breath to farewell.' },
  { icon: HeartHandshake, title: 'Choose the big things together', text: 'Exchange letters as children, build traditions, and choose shared goals as adults. Every agreement needs both players.' },
];

const DEFAULT_SHARED = ['Your nickname and whether you are in the room', 'Your character’s portrait, age, country, job and family', 'Health and happiness scores', 'A few recent everyday moments', 'Messages, voice and the memories you agree on'];
const DEFAULT_PRIVATE = ['Money and balances', 'Medical and financial events', 'Pending decisions and personal choices', 'The reflections you write'];

export function DuoThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  useEffect(() => { setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'); }, []);
  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('1in8bn-theme', next); } catch { /* the choice still applies to this page */ }
  }
  const label = theme === 'dark' ? 'Use light appearance' : 'Use dark appearance';
  return <button type="button" className="dlp-theme" aria-label={label} title={label} onClick={toggle}>{theme === 'dark' ? <Sun size={16}/> : <Moon size={16}/>}</button>;
}

function Meter({ label, value }: { label: string; value: number }) {
  return <div className="dlp-meter"><span>{label}</span><b>{value}</b><i style={{ width: `${value}%` }}/></div>;
}

function RoomPreview({ caption }: { caption?: string }) {
  return <figure className="dlp-room">
    <div className="dlp-room-frame" role="img" aria-label="Example room: Amadou in Mali and Salma in Iran at age 18, with a shared memory, two chat messages and voice connected">
      <div className="dlp-room-bar" aria-hidden="true"><span className="dlp-dots"><i/><i/><i/></span><span>A life, together · 2044</span><span className="dlp-live"><AudioLines size={13}/> Voice on</span></div>
      <div className="dlp-room-body" aria-hidden="true">
        <article className="dlp-life">
          <p className="dlp-kicker">MY LIFE · AGE 18</p>
          <div className="dlp-person"><Portrait seed={17} age={18}/><div><strong>Amadou Mensah</strong><small>Bamako, Mali · Student</small></div></div>
          <Meter label="Health" value={91}/><Meter label="Happiness" value={78}/>
          <p className="dlp-moment"><span>Age 18</span>You are accepted into a teacher-training course.</p>
        </article>
        <div className="dlp-between">
          <div className="dlp-shared"><HeartHandshake size={16}/><div><strong>2044 · Two paths meet</strong><small>Both of you agreed</small></div></div>
          <p className="dlp-bubble">Did you choose university?</p>
          <p className="dlp-bubble mine">Yes! Moving to Tehran.</p>
          <p className="dlp-typing"><MessageCircle size={13}/> Mia is typing…</p>
        </div>
        <article className="dlp-life dlp-friend">
          <p className="dlp-kicker">MIA’S LIFE · AGE 18 <em>Choosing</em></p>
          <div className="dlp-person"><Portrait seed={42} age={18} sex="F"/><div><strong>Salma Nasser</strong><small>Shiraz, Iran · Student</small></div></div>
          <Meter label="Health" value={95}/><Meter label="Happiness" value={84}/>
          <p className="dlp-moment"><span>Age 17</span>A summer job teaches you more than you expected.</p>
        </article>
      </div>
    </div>
    <figcaption>{caption ?? 'An example room. Every pair of lives is drawn fresh.'}</figcaption>
  </figure>;
}

export function DuoLandingSections({ onStart, copy }: { onStart: () => void; copy?: DuoLandingCopy }) {
  const steps = copy ? [
    { icon: Link2, title: copy.step1Title, text: copy.step1Text },
    { icon: Users, title: copy.step2Title, text: copy.step2Text },
    { icon: Sprout, title: copy.step3Title, text: copy.step3Text },
    { icon: HeartHandshake, title: copy.step4Title, text: copy.step4Text },
  ] : DEFAULT_STEPS;

  const shared = copy?.sharedList ?? DEFAULT_SHARED;
  const priv = copy?.privateList ?? DEFAULT_PRIVATE;
  const faqs = copy?.faqs ?? DUO_FAQ;

  return <>
    <section className="dlp-section dlp-preview" aria-labelledby="dlp-preview-title">
      <div className="dlp-head">
        <p className="duo-eyebrow">{copy?.insideRoomTag ?? 'INSIDE A ROOM'}</p>
        <h2 id="dlp-preview-title">{copy?.insideRoomTitle ?? 'Two lives on one screen.'}</h2>
        <p>{copy?.insideRoomDesc ?? 'Follow your own story while your friend’s life unfolds beside it. You can see where they are, what just happened to them and when they are deciding something.'}</p>
      </div>
      <RoomPreview caption={copy?.roomExampleCaption} />
    </section>

    <section className="dlp-section dlp-steps" aria-labelledby="dlp-steps-title">
      <div className="dlp-head">
        <p className="duo-eyebrow">{copy?.howItWorksTag ?? 'HOW IT WORKS'}</p>
        <h2 id="dlp-steps-title">{copy?.howItWorksTitle ?? 'From one link to two lifetimes.'}</h2>
      </div>
      <ol>
        {steps.map(({ icon: Icon, title, text }, index) => (
          <li key={title}>
            <span className="dlp-step-icon"><Icon size={18} aria-hidden="true"/></span>
            <span className="dlp-step-n">0{index + 1}</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </li>
        ))}
      </ol>
    </section>

    <section className="dlp-section dlp-split" aria-labelledby="dlp-share-title">
      <div className="dlp-head">
        <p className="duo-eyebrow">{copy?.privacyTag ?? 'WHAT YOUR FRIEND SEES'}</p>
        <h2 id="dlp-share-title">{copy?.privacyTitle ?? 'Close, with room for privacy.'}</h2>
        <p>{copy?.privacyDesc ?? 'Your friend follows the public side of your life. The private parts stay on your side of the room.'}</p>
      </div>
      <div className="dlp-lists">
        <div className="dlp-list">
          <h3><Users size={17} aria-hidden="true"/> {copy?.sharedTitle ?? 'Shared with your friend'}</h3>
          <ul>{shared.map(item => <li key={item}><Check size={15} aria-hidden="true"/>{item}</li>)}</ul>
        </div>
        <div className="dlp-list dlp-private">
          <h3><EyeOff size={17} aria-hidden="true"/> {copy?.privateTitle ?? 'Stays with you'}</h3>
          <ul>{priv.map(item => <li key={item}><EyeOff size={15} aria-hidden="true"/>{item}</li>)}</ul>
        </div>
      </div>
    </section>

    <section className="dlp-voice" aria-labelledby="dlp-voice-title">
      <div className="dlp-voice-copy">
        <p className="duo-eyebrow">{copy?.voiceTag ?? 'VOICE TOGETHER'}</p>
        <h2 id="dlp-voice-title">{copy?.voiceTitle ?? 'Talk while you live it.'}</h2>
        <p>{copy?.voiceDesc ?? 'Turn on voice from the top of the room whenever you like. Friends can talk for as long as the room is open.'}</p>
        <ul>
          <li><Check size={16} aria-hidden="true"/>{copy?.voicePoint1 ?? 'Starts only when you turn it on and allow the microphone'}</li>
          <li><Check size={16} aria-hidden="true"/>{copy?.voicePoint2 ?? 'Mute or leave at any time; text chat always works'}</li>
          <li><Check size={16} aria-hidden="true"/>{copy?.voicePoint3 ?? 'This game does not record or transcribe calls'}</li>
        </ul>
      </div>
      <div className="dlp-voice-card">
        <div className="dlp-call" aria-hidden="true">
          <div className="dlp-caller"><Portrait seed={17} age={30}/><span>You</span></div>
          <div className="dlp-wave">{Array.from({ length: 15 }, (_, index) => <i key={index} style={{ animationDelay: `${(index % 5) * 0.12}s` }}/>)}</div>
          <div className="dlp-caller"><Portrait seed={42} age={30} sex="F"/><span>Your friend</span></div>
        </div>
        <p className="dlp-call-state"><Mic size={14} aria-hidden="true"/> {copy?.voiceConnected ?? 'Voice connected · no time limit for friends'}</p>
        <PoweredByAgora  variant="card"/>
      </div>
    </section>

    <section className="dlp-section dlp-faq" aria-labelledby="dlp-faq-title">
      <div className="dlp-head">
        <p className="duo-eyebrow">{copy?.faqTag ?? 'QUESTIONS'}</p>
        <h2 id="dlp-faq-title">{copy?.faqTitle ?? 'Before you invite someone.'}</h2>
      </div>
      <div className="dlp-faq-list">
        {faqs.map(item => (
          <details key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </section>

    <section className="dlp-cta" aria-labelledby="dlp-cta-title">
      <h2 id="dlp-cta-title">{copy?.readyTitle ?? 'Ready when your person is.'}</h2>
      <p>{copy?.readyDesc ?? 'Create a room, send one link and be born somewhere new together.'}</p>
      <button className="duo-primary" type="button" onClick={onStart}>
        {copy?.createRoomBtn ?? 'Create a room'} <ArrowRight size={18} aria-hidden="true"/>
      </button>
    </section>
  </>;
}
