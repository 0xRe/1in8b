import { useState,useRef } from 'react';
import type { Life } from '../game/types';
import type { Locale, translator } from '../lib/i18n';
import { countryName } from '../game/countries';
import { Camera, Home, Compass, BookOpen, Sparkles } from 'lucide-react';

interface Props {
  past: Life[];
  locale: Locale;
  t: ReturnType<typeof translator>;
  onOpenLife: (life: Life) => void;
  onOpenRoom: (life: Life) => void;
  onOpenVillage: () => void;
  onOpenWish: () => void;
}

export function PastLivesShowcase({
  past,
  locale,
  t,
  onOpenLife,
  onOpenRoom,
  onOpenVillage,
  onOpenWish,
}: Props) {
  const [selectedId, setSelectedId] = useState<string>(past[0]?.id || '');
  const [busy, setBusy] = useState(false);
  const showcaseRef = useRef<HTMLDivElement>(null);

  const selectedLife = past.find((l) => l.id === selectedId) || past[0];

  const handleSaveShowcase = async () => {
    if (!past.length || busy) return;
    setBusy(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const items = past.slice(0, 24); // Up to 24 lives on the curio showcase
      const count = items.length;
      const cols = count <= 6 ? 3 : count <= 16 ? 4 : 6;
      const width = 1080;
      const margin = 60;
      const colWidth = (width - margin * 2) / cols;
      const rowHeight = 170;
      const headerHeight = 220;
      const footerHeight = 100;
      const rows = Math.ceil(count / cols);
      const height = Math.max(1080, headerHeight + rows * rowHeight + footerHeight);

      canvas.width = width;
      canvas.height = height;

      // Background warm parchment
      ctx.fillStyle = '#FBF8F2';
      ctx.fillRect(0, 0, width, height);

      // Delicate outer border
      ctx.strokeStyle = '#E2D7C3';
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 20, width - 40, height - 40);
      ctx.strokeStyle = '#D1C2A5';
      ctx.lineWidth = 1;
      ctx.strokeRect(26, 26, width - 52, height - 52);

      // Header title
      ctx.fillStyle = '#2C221E';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 52px system-ui, sans-serif';
      ctx.fillText(t('ui.pastShelfTitle'), width / 2, 90);

      // Subtitle
      ctx.fillStyle = '#7C6F64';
      ctx.font = '22px system-ui, sans-serif';
      ctx.fillText(t('ui.shelfSubtitle'), width / 2, 145);

      // Render rows of wooden shelves and standing character figures
      for (let r = 0; r < rows; r++) {
        const shelfY = headerHeight + (r + 1) * rowHeight - 25;
        // Wooden shelf plank
        ctx.fillStyle = '#C49A6C';
        ctx.fillRect(margin - 10, shelfY, width - margin * 2 + 20, 14);
        ctx.fillStyle = '#9E764C';
        ctx.fillRect(margin - 10, shelfY + 14, width - margin * 2 + 20, 6);

        // Subtle shelf bracket shadows
        ctx.fillStyle = 'rgba(74, 50, 30, 0.15)';
        ctx.fillRect(margin - 6, shelfY + 20, width - margin * 2 + 12, 4);
      }

      // Render individual lives standing on shelves
      items.forEach((life, idx) => {
        const r = Math.floor(idx / cols);
        const c = idx % cols;
        const currentCols = Math.min(cols, count - r * cols);
        const startX = (width - currentCols * colWidth) / 2;
        const x = startX + c * colWidth;
        const shelfY = headerHeight + (r + 1) * rowHeight - 25;

        // Flag badge
        ctx.font = '42px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(life.country.flag, x + colWidth / 2, shelfY - 45);

        // Person name
        ctx.fillStyle = '#2C221E';
        ctx.font = 'bold 18px system-ui, sans-serif';
        ctx.fillText(life.name, x + colWidth / 2, shelfY - 24);

        // Country & age
        ctx.fillStyle = '#6E6155';
        ctx.font = '14px system-ui, sans-serif';
        ctx.fillText(
          `${countryName(life.country, locale)} · ${life.age} ${t('age')}`,
          x + colWidth / 2,
          shelfY - 6
        );
      });

      // Footer
      ctx.fillStyle = '#A39686';
      ctx.font = '16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('1in8bn.com · 100% Free Forever', width / 2, height - 40);

      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `past-lives-showcase.png`;
      a.click();
    } catch (err) {
      console.error('Failed to export showcase photo:', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="shf-content" ref={showcaseRef}>
        <div className="shf-header">
          <div>
            <p className="cm-sub">{t('ui.pastShelfSubtitle')}</p>
          </div>
        </div>

        <div className="shf-w" id="shfW">
          {/* Wooden curio shelf grid */}
          <div className="shf">
            {past.map((life) => {
              const isSelected = selectedId === life.id;
              return (
                <button
                  key={life.id}
                  type="button"
                  className={`shf-i ${isSelected ? 'active' : ''}`}
                  data-shelf={life.id}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedId(life.id)}
                  aria-label={`${life.name}, ${countryName(life.country, locale)}, ${life.age} ${t('age')}`}
                >
                  <span className="shf-f">{life.country.flag}</span>
                  <span className="shf-n">{life.name}</span>
                  <span className="shf-s">{countryName(life.country, locale)}</span>
                  <span className="shf-s">{life.age} {t('age')}</span>
                </button>
              );
            })}
          </div>

          {/* Selected Life Detail Card */}
          {selectedLife && (
            <div className="shf-card" id="shfCard">
              <div className="shf-card-avatar">
                <span className="shf-flag-large">{selectedLife.country.flag}</span>
              </div>
              <div className="shf-card-info">
                <b>{selectedLife.name}</b>
                <span className="shf-c1">
                  {countryName(selectedLife.country, locale)} · {selectedLife.age} {t('age')}
                </span>
                <span className="shf-c2">
                  ({selectedLife.birthYear} – {selectedLife.year}) · {t(`job.${selectedLife.stats.job}`)}
                </span>
                {selectedLife.reflections?.summary && (
                  <q className="pl-q">{selectedLife.reflections.summary}</q>
                )}
                <div className="kp-row">
                  <button
                    type="button"
                    className="ghost sm"
                    data-shpast={selectedLife.id}
                    onClick={() => onOpenLife(selectedLife)}
                  >
                    <BookOpen size={14} />
                    {t('ui.reviewLife')}
                  </button>
                  <button
                    type="button"
                    className="ghost sm"
                    data-shmemo={selectedLife.id}
                    onClick={() => onOpenRoom(selectedLife)}
                  >
                    <Sparkles size={14} />
                    {t('ui.viewMemoryRoom')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom navigation & actions */}
          <div className="kp-row shf-actions">
            <button type="button" className="ghost sm" id="shfVlg" onClick={onOpenVillage}>
              <Home size={15} />
              {t('ui.seeAsVillage')}
            </button>
            <button
              type="button"
              className="ghost sm"
              id="shfPic"
              disabled={busy}
              onClick={handleSaveShowcase}
            >
              <Camera size={15} />
              {t('ui.saveShowcasePng')}
            </button>
            <button type="button" className="ghost sm" id="shfWish" onClick={onOpenWish}>
              <Compass size={15} />
              {t('ui.seeAsWish')}
            </button>
          </div>

          <p className="pl-hint">{t('ui.shelfOnlyHere')}</p>
        </div>
    </div>
  );
}
