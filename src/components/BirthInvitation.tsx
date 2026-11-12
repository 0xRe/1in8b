import { useEffect, useState } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import { readBirthInvitation } from '../lib/social-sharing';
import { birthCopy, fillBirthCopy } from '../lib/birth-experience-copy';
import { countryName } from '../game/countries';
import type { Country } from '../game/types';
import { translator, type Locale } from '../lib/i18n';
import { readLifeInvitation, rememberInviter } from '../lib/life-share';
import { birthOdds, fillViral, viralCopy } from '../lib/viral-copy';
import { Portrait } from './Visuals';
import { createLife, DEFAULT_SETTINGS } from '../game/engine';

const dismissedInvitations = new Set<string>();
type Invitation = { country: Country | null; life: ReturnType<typeof readLifeInvitation> };

function invitationFrom(search: string): Invitation | null {
  const country = readBirthInvitation(search), life = readLifeInvitation(search);
  if (!country && !life) return null;
  // If born query parameter is omitted or stripped, deterministically resolve birth country from seed
  const fallbackCountry = (!country && life) ? createLife(DEFAULT_SETTINGS, life.code.seed).migration.birthCountry : null;
  return {
    country: country ?? fallbackCountry,
    life
  };
}

export function BirthInvitation({ locale, onBegin, disabled, search = '' }: { locale: Locale; onBegin: () => void; disabled: boolean; search?: string }) {
  // Rendered on the server from the request URL: a friend sees who invited them in the first paint,
  // not the generic home page while the game's script loads (often seconds on a phone).
  const [invite, setInvite] = useState<Invitation | null>(() => invitationFrom(search)), copy = birthCopy(locale), viral = viralCopy(locale);
  useEffect(() => {
    const key = locale + location.search, found = invitationFrom(location.search), country = found?.country ?? null, life = found?.life ?? null;
    setInvite(dismissedInvitations.has(key) ? null : found);
    if (life && life.code.age > 0) rememberInviter(life.code, life.name, country?.id ?? '');
  }, [locale]);
  if (!invite) return null;
  const { country, life } = invite, place = country ? countryName(country, locale) : '';
  const begin = () => {  onBegin(); };
  const dismiss = <button className="icon-button" aria-label={copy.dismiss} onClick={() => { dismissedInvitations.add(locale + location.search); setInvite(null); }}><X size={17} /></button>;
  if (life) {
    // A friend's finished life: who they were first, then the same draw that placed them.
    // A newborn's link names the baby and the odds of that birthplace; a finished life names its years.
    const newborn = life.code.age === 0;
    const grain = newborn ? (country ? birthOdds(country, locale) : '') : life.code.grain === null ? '' : fillViral(viral.inviteGrain, { grain: translator(locale)(`grain.name${life.code.grain}`) });
    const who = newborn ? fillViral(viral.bornName, { name: life.name || '1in8bn', country: place || '—' }).split(/(?<=[.。!?？])\s*/)[0] : fillViral(viral.inviteLife, { name: life.name || '1in8bn', age: life.code.age, country: place || '—' });
    return <section className="birth-invitation birth-invitation--life" aria-label={viral.inviteTurn}>
      <span className="birth-invitation-face"><Portrait seed={life.code.seed} age={life.code.age} sex={life.code.sex} /></span>
      <div><p>{who}</p>{grain && <small className="birth-invitation-grain">{grain}</small>}<strong>{viral.inviteTurn}</strong></div>
      <button className="primary" disabled={disabled} onClick={begin}>{viral.inviteCta}<ArrowUpRight size={16} /></button>{dismiss}
    </section>;
  }
  return <section className="birth-invitation" aria-label={copy.shareTitle}><div><p>{fillBirthCopy(copy.invite, { country: place })}</p><small>{copy.inviteHint}</small></div><button className="primary" disabled={disabled} onClick={begin}>{copy.inviteCta}<ArrowUpRight size={16} /></button>{dismiss}</section>;
}
