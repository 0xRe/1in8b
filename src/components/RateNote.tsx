
import type { translator } from '../lib/i18n';

interface Props {
  t: ReturnType<typeof translator>;
}

export function RateNote({ t }: Props) {
  return (
    <div className="ratenote" id="rateNote">
      <p>
        <b>{t('ui.rateNoteAge')}</b>
        <span>{t('ui.rateNoteThemes')}</span>
        <span>{t('ui.rateNoteCare')}</span>
        <span>{t('ui.rateNoteFree')}</span>
      </p>
    </div>
  );
}
