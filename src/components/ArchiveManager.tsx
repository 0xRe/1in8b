import { useRef, useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import type { Life } from '../game/types';
import { countryName } from '../game/countries';
import { archiveCopy } from '../lib/archive-copy';
import { SaveConflict } from '../lib/persistence';
import type { Locale, translator } from '../lib/i18n';
import './archive-manager.css';

export function ArchiveManager({past, active, locale, t, onRemove, onBackup}: {
  past: Life[]; active: boolean; locale: Locale; t: ReturnType<typeof translator>;
  onRemove: (ids: readonly string[]) => Promise<void>; onBackup: () => void;
}) {
  const copy = archiveCopy[locale];
  const [requested, setRequested] = useState<string[] | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const pending = useRef(false);
  const select = (ids: string[]) => { setError(''); setNotice(''); setRequested(ids); };
  async function remove() {
    if (!requested?.length || pending.current) return;
    pending.current = true; setWorking(true); setError('');
    try { await onRemove(requested); setRequested(null); setNotice(copy.removed); }
    catch (cause) { setError(t(cause instanceof SaveConflict ? 'ui.saveConflict' : 'storageError')); }
    finally { pending.current = false; setWorking(false); }
  }
  return <section className="archive-manager" aria-busy={working}>
    <p className="archive-warning">{copy.warning}</p>
    {active && <p className="archive-active">{copy.active}</p>}
    <button className="secondary" onClick={onBackup} disabled={working}><Download size={16} aria-hidden="true" />{t('export')}</button>
    {requested ? <div className="archive-confirm">
      <h2>{requested.length === 1 ? copy.confirmOne : copy.confirmMany.replace('{n}', requested.length.toLocaleString(locale))}</h2>
      {requested.length === 1 && <p>{past.find(life => life.id === requested[0])?.name}</p>}
      <div className="actions">
        <button autoFocus className="secondary" disabled={working} onClick={() => { setRequested(null); setError(''); }}>{t('cancel')}</button>
        <button className="archive-delete" disabled={working} onClick={remove}><Trash2 size={16} aria-hidden="true" />{working ? t('loading') : copy.remove}</button>
      </div>
    </div> : <>
      {past.length ? <ul className="archive-records">{past.map(life => <li key={life.id}>
        <div><strong>{life.name}</strong><small>{countryName(life.country, locale)} · {life.birthYear}–{life.year} · {t('years', {n: life.age})}</small></div>
        <button className="archive-delete" aria-label={`${copy.remove}: ${life.name}`} onClick={() => select([life.id])}><Trash2 size={16} aria-hidden="true" /><span>{copy.remove}</span></button>
      </li>)}</ul> : <p className="muted">{t('emptyLives')}</p>}
      <button className="archive-delete" disabled={!past.length || working} onClick={() => select(past.map(life => life.id))}><Trash2 size={16} aria-hidden="true" />{copy.clear}</button>
    </>}
    {error && <p className="archive-error" role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
  </section>;
}
