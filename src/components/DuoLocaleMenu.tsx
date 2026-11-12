import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { LOCALES, type Locale } from '../lib/i18n';
import { LocaleFlag } from './LocaleFlag';

export function DuoLocaleMenu({ locale, onChange }: { locale: Locale; onChange: (next: Locale) => void }) {
  const [open, setOpen] = useState(false);
  const currentLanguage = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  return (
    <nav
      className="languages duo-languages"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setOpen(false);
          event.currentTarget.querySelector<HTMLButtonElement>('.language-toggle')?.focus();
        }
      }}
      aria-label="Language"
    >
      <button
        type="button"
        className="language-toggle"
        aria-expanded={open}
        aria-controls="duo-header-languages"
        onClick={() => setOpen((o) => !o)}
      >
        <LocaleFlag locale={locale} />
        <span lang={currentLanguage.html}>{currentLanguage.label}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      <div id="duo-header-languages" className="language-options" hidden={!open}>
        {LOCALES.map((l) => (
          <button
            key={l.code}
            type="button"
            className={`language-option-btn ${locale === l.code ? 'active' : ''}`}
            onClick={() => {
              onChange(l.code);
              setOpen(false);
            }}
            lang={l.html}
            aria-current={locale === l.code ? 'true' : undefined}
          >
            <LocaleFlag locale={l.code} />
            <span>{l.label}</span>
            <span className="locale-check" aria-hidden="true">
              {locale === l.code ? '✓' : ''}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
