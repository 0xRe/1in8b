import { ArrowRight, Users } from 'lucide-react';
import { duoPath } from '../lib/site-url';
import type { Locale } from '../lib/i18n';
import { getDuoEntryCopy } from '../lib/duo-entry-copy';

/** An inviting recommendation for Duo / Together mode; opens /together/ */
export function DuoEndingCard({ locale }: { locale: Locale }) {
  const copy = getDuoEntryCopy(locale);
  return (
    <a
      className="duo-ending-card"
      href={duoPath(locale)}

      aria-label={`${copy.endingTitle} · ${copy.endingCta}`}
    >
      <span className="duo-ending-icon" aria-hidden="true">
        <Users size={22} />
      </span>
      <span className="duo-ending-text">
        <b>{copy.endingTitle}</b>
        <small>{copy.endingBody}</small>
      </span>
      <span className="duo-ending-cta">
        {copy.endingCta}
        <ArrowRight size={15} aria-hidden="true" />
      </span>
    </a>
  );
}

export function DuoFooterLink({ locale }: { locale: Locale }) {
  const copy = getDuoEntryCopy(locale);
  return (
    <a
      className="duo-footer-link"
      href={duoPath(locale)}

    >
      {copy.footerLabel}
    </a>
  );
}
