import { useState, useEffect, useRef, useId } from 'react';
import type { translator, Locale } from '../lib/i18n';
import {
  getUnlivedLives,
  clearUnlivedLives,
  isStonesHidden,
  setStonesHidden,
  type UnlivedLife,
} from '../lib/unlived';
import { publicCountryName } from '../game/countries';
import { X } from 'lucide-react';

type T = ReturnType<typeof translator>;

// Natural pebble configurations for the stone cairn stack (up to 12 visible pebbles)
const PEBBLE_SPECS = [
  { cx: 16, cy: 26, rx: 13, ry: 4.8, rot: -3, cls: 'u0' },
  { cx: 17, cy: 21, rx: 11, ry: 4.2, rot: 4, cls: 'u1' },
  { cx: 15, cy: 17, rx: 9.5, ry: 3.8, rot: -2, cls: 'u2' },
  { cx: 16.5, cy: 13, rx: 8, ry: 3.4, rot: 5, cls: 'u1' },
  { cx: 16, cy: 9.5, rx: 6.5, ry: 3.0, rot: -4, cls: 'u0' },
  { cx: 15.5, cy: 6.5, rx: 5.2, ry: 2.6, rot: 2, cls: 'u2' },
  { cx: 16, cy: 4, rx: 4.0, ry: 2.2, rot: -1, cls: 'u1' },
  { cx: 16, cy: 2.5, rx: 3.0, ry: 1.8, rot: 3, cls: 'u0' },
  { cx: 16, cy: 1.5, rx: 2.2, ry: 1.4, rot: -2, cls: 'u2' },
  { cx: 16, cy: 0.8, rx: 1.6, ry: 1.1, rot: 1, cls: 'u1' },
];

export function UnlivedStones({
  t,
  locale,
  refreshToken = 0,
}: {
  t: T;
  locale: Locale;
  refreshToken?: number;
}) {
  const [lives, setLives] = useState<UnlivedLife[]>([]);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  useEffect(() => {
    setLives(getUnlivedLives());
    setHidden(isStonesHidden());
  }, [refreshToken]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || hidden || lives.length === 0 || !dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, [open, hidden, lives.length]);

  if (hidden || lives.length === 0) return null;

  const count = lives.length;
  const visiblePebbles = Math.min(count, PEBBLE_SPECS.length);

  return (
    <>
      <div className="unlivedc" id="unlivedC" aria-hidden="true">
        <svg
          viewBox="0 0 32 32"
          width="32"
          height="32"
          aria-hidden="true"
          focusable="false"
        >
          {PEBBLE_SPECS.slice(0, visiblePebbles).map((p, i) => (
            <ellipse
              key={i}
              className={p.cls}
              cx={p.cx}
              cy={p.cy}
              rx={p.rx}
              ry={p.ry}
              transform={`rotate(${p.rot} ${p.cx} ${p.cy})`}
            />
          ))}
        </svg>
      </div>

      <button
        type="button"
        className="unlived"
        id="unlived"
        aria-label={t("unlived.countLabel", { count })}
        title={t("unlived.countLabel", { count })}
        onClick={() => setOpen(true)}
      />

      {open && (
        <dialog
          ref={dialogRef}
          className="modal"
          aria-labelledby={headingId}
          onCancel={() => setOpen(false)}
          onKeyDown={(event) => event.stopPropagation()}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <header>
            <span id={headingId}>{t("unlived.title")}</span>
            <button
              className="icon-button"
              onClick={() => setOpen(false)}
              aria-label={t("close")}
            >
              <X size={20} />
            </button>
          </header>
          <div className="modal-body unlived-modal-body">
            <p className="unlived-desc">{t("unlived.desc")}</p>
            <ul className="unlived-list">
              {lives.map((item) => (
                <li key={item.id} className="unlived-item">
                  <span className="unlived-name">{item.name}</span>
                  <span className="unlived-meta">
                    {publicCountryName(item.country, locale)} ·{" "}
                    {item.age === 0
                      ? t("unlived.infancy")
                      : t("unlived.stoppedAt", { age: item.age })}
                  </span>
                </li>
              ))}
            </ul>
            <div className="unlived-actions">
              <button
                type="button"
                className="primary"
                onClick={() => {
                  clearUnlivedLives();
                  setLives([]);
                  setOpen(false);
                }}
              >
                {t("unlived.setDown")}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setStonesHidden(true);
                  setHidden(true);
                  setOpen(false);
                }}
              >
                {t("unlived.hide")}
              </button>
            </div>
            <p className="unlived-privacy-note tiny muted">
              {t("unlived.privacyNote")}
            </p>
          </div>
        </dialog>
      )}
    </>
  );
}
