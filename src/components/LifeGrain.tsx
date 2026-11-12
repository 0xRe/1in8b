import type { Life } from '../game/types';
import { GRAIN_NAMES, GRAIN_PAIRS, lifeGrain } from '../lib/life-insights';
import { translator, type Locale } from '../lib/i18n';
import './life-records.css';
export function LifeGrain({ life, onShare, locale = 'en' }: { life: Life; onShare?: () => void; locale?: Locale }) {
  const grain = lifeGrain(life), t = translator(locale);
  const label = (name: string) => t(`grain.${name.toLowerCase()}`);
  return <section className="life-grain" aria-labelledby="life-grain-title">
    <p className="eyebrow">{t('grain.title')}</p>
    <h2 id="life-grain-title">{t(grain.nameKey)}</h2>
    <p>{t('grain.note')}</p>
    <p className="muted">{t('record.focusCoverage', { recorded: grain.recordedAdultYears, missing: grain.missingAdultYears })}</p>
    {grain.insufficient ? <p>{t('grain.short')}</p> : <div className="grain-axes">{grain.axes.map(axis => <div className="grain-axis" key={axis.left}>
      <div className="grain-axis-labels"><span>{label(axis.left)}</span><span>{label(axis.right)}</span></div>
      <meter min={0} max={100} value={axis.score} aria-label={`${label(axis.left)} – ${label(axis.right)}`} />
      <p>{t(axis.evidenceKey, axis.evidenceParams)}</p>
    </div>)}</div>}
    {!grain.insufficient && grain.mixed && <p>{t('grain.mixed')}</p>}
    <details><summary>{t('grain.method')}</summary><p>{t('grain.formula')}</p></details>
    <details><summary>{t('grain.all')}</summary><ol className="grain-catalog">{GRAIN_NAMES.map((name, index) => <li key={name} aria-current={!grain.mixed && !grain.insufficient && index === grain.index ? 'true' : undefined}><strong>{t(`grain.name${index}`)}</strong><small>{GRAIN_PAIRS.map((pair, bit) => label(pair[(index >> (3 - bit)) & 1])).join(' · ')}</small></li>)}</ol></details>
    {onShare && <button type="button" onClick={onShare}>{t('grain.share')}</button>}
  </section>;
}
