import { useEffect, useState } from 'react';
import { Share2 } from 'lucide-react';
import type { Life } from '../game/types';
import { countryName, getCountryById } from '../game/countries';
import type { Locale } from '../lib/i18n';
import { decodeLifeCode, readInviter, type Inviter } from '../lib/life-share';
import { fillViral, viralCopy } from '../lib/viral-copy';
import { Portrait } from './Visuals';
import { createLife, DEFAULT_SETTINGS } from '../game/engine';

/** After a life that began from a friend's link: both lives side by side, and a way to answer. */
export function InvitedComparison({ life, locale, onReply }: { life: Life; locale: Locale; onReply: () => void }) {
  const [inviter, setInviter] = useState<Inviter | null>(null), copy = viralCopy(locale);
  useEffect(() => {
    const found = readInviter();
    setInviter(found);

  }, [life.id, life.alive, life.seed, life.age]);
  const code = inviter ? decodeLifeCode(inviter.code) : null;
  // Opening one's own link is not an invitation from someone else.
  if (!inviter || !code || life.alive || code.seed === life.seed >>> 0) return null;
  const theirCountry = getCountryById(inviter.country) ?? createLife(DEFAULT_SETTINGS, code.seed).migration.birthCountry;
  const place = theirCountry ? countryName(theirCountry, locale) : '';
  const mine = countryName(life.migration?.birthCountry ?? life.country, locale), name = inviter.name || '1in8bn';
  return <section className="invited-compare" aria-label={fillViral(copy.replyTitle, { name })}>
    <h3>{fillViral(copy.replyTitle, { name })}</h3>
    <div className="invited-compare-pair">
      <figure><span className="invited-compare-face"><Portrait seed={code.seed} age={code.age} sex={code.sex} /></span><figcaption><b>{name}</b><span><em>{code.age}</em> · {place}</span></figcaption></figure>
      <figure><span className="invited-compare-face"><Portrait seed={life.seed} age={life.age} sex={life.sex} /></span><figcaption><b>{copy.replyYou} · {life.name}</b><span><em>{life.age}</em> · {mine}</span></figcaption></figure>
    </div>
    <button type="button" className="primary" onClick={() => {  onReply(); }}><Share2 size={16} />{copy.replyCta}</button>
  </section>;
}
