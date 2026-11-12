
import type { AutoLean } from '../lib/auto-lean';
import { AUTO_LEAN_OPTIONS } from '../lib/auto-lean';
import type { translator } from '../lib/i18n';

interface Props {
  value: AutoLean;
  onChange: (lean: AutoLean) => void;
  t: ReturnType<typeof translator>;
  onClose?: () => void;
}

const LEAN_ICONS: Record<AutoLean, string> = {
  balanced: '🌿',
  cautious: '🛡️',
  adventurous: '🧭',
  family: '🏡',
};

export function AutoInclinationPicker({ value, onChange, t, onClose }: Props) {
  return (
    <div className="lean-picker" id="leanSheet" role="radiogroup" aria-label={t('ui.leanTitle')}>
      <p className="lean-desc">{t('ui.leanDesc')}</p>
      <div className="lean-options-grid">
        {AUTO_LEAN_OPTIONS.map((lean) => {
          const isSelected = value === lean;
          return (
            <button
              key={lean}
              type="button"
              className={`lean-option-btn ${isSelected ? 'active' : ''}`}
              role="radio"
              aria-checked={isSelected}
              onClick={() => {
                onChange(lean);
                if (onClose) onClose();
              }}
            >
              <span className="lean-option-icon">{LEAN_ICONS[lean]}</span>
              <div className="lean-option-text">
                <span className="lean-option-title">
                  {t(
                    lean === 'balanced'
                      ? 'ui.leanBalanced'
                      : lean === 'cautious'
                      ? 'ui.leanCautious'
                      : lean === 'adventurous'
                      ? 'ui.leanAdventurous'
                      : 'ui.leanFamily'
                  )}
                </span>
              </div>
              {isSelected && <span className="lean-option-check">✓</span>}
            </button>
          );
        })}
      </div>
      {onClose && (
        <div className="lean-actions">
          <button type="button" className="ghost sm" onClick={onClose}>
            {t('close')}
          </button>
        </div>
      )}
    </div>
  );
}
