import { useState } from 'react';
import type { Life } from '../game/types';
import type { Locale, translator } from '../lib/i18n';
import { countryName } from '../game/countries';
import { generateUnfulfilledWishes } from '../lib/unfulfilled-wishes';
import { Camera,Share2,Sparkles,X } from 'lucide-react';

interface Props {
  life: Life;
  locale: Locale;
  t: ReturnType<typeof translator>;
  onClose: () => void;
}

export function UnfulfilledWishesModal({ life, locale, t, onClose }: Props) {
  const wishes = generateUnfulfilledWishes(life, locale, t);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const currentWish = wishes[selectedIndex] || wishes[0];
  const cName = countryName(life.migration?.birthCountry || life.country, locale);

  const handleSaveCard = () => {
    if (!currentWish) return;
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 640;
      canvas.height = 680;

      // Soft twilight gradient
      const grad = ctx.createLinearGradient(0, 0, 0, 680);
      grad.addColorStop(0, '#fdfbf7');
      grad.addColorStop(1, '#f1ede4');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 680);

      // Postcard border
      ctx.strokeStyle = '#d5cebe';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(20, 20, 600, 640);

      // Stamp in top right
      ctx.strokeStyle = '#b8af9c';
      ctx.strokeRect(520, 40, 75, 90);
      ctx.fillStyle = '#8c806a';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(life.country.flag, 557, 80);
      ctx.fillText(`${life.year}`, 557, 105);

      // Title & Header
      ctx.textAlign = 'left';
      ctx.fillStyle = '#6e6250';
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillText(`${t('ui.unfulfilledWishesTitle')} · 1in8bn.com`, 45, 65);

      ctx.fillStyle = '#2d251a';
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.fillText(`${currentWish.icon} ${currentWish.title}`, 45, 110);

      ctx.fillStyle = '#594d3c';
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText(`${life.name} (${life.birthYear} – ${life.year}, † ${life.age} · ${cName})`, 45, 140);

      // Divider line
      ctx.strokeStyle = '#e0d8ca';
      ctx.beginPath();
      ctx.moveTo(45, 165);
      ctx.lineTo(595, 165);
      ctx.stroke();

      // Regret (What was missed in life)
      ctx.fillStyle = '#8c7e6b';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText(t('ui.wishRegretLabel').toUpperCase(), 45, 205);

      ctx.fillStyle = '#4a3f31';
      ctx.font = '15px system-ui, sans-serif';
      wrapText(ctx, `“${currentWish.regret}”`, 45, 235, 550, 24);

      // Dream (The imagined solace)
      ctx.fillStyle = '#b45309';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText(t('ui.wishDreamLabel').toUpperCase(), 45, 330);

      ctx.fillStyle = '#1c1917';
      ctx.font = 'italic 16px system-ui, sans-serif';
      wrapText(ctx, `“${currentWish.dream}”`, 45, 360, 550, 26);

      // Eulogy quote at bottom
      ctx.fillStyle = '#6b5d49';
      ctx.font = '14px system-ui, sans-serif';
      wrapText(ctx, currentWish.quote, 45, 490, 550, 22);

      // Footer
      ctx.fillStyle = '#9e917d';
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText('100% Free Forever · May gentle wishes accompany every departed soul.', 45, 620);

      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `wish-${life.name.replace(/\s+/g, '-')}-${currentWish.id}.png`;
      a.click();
    } catch {}
  };

  const handleShare = async () => {
    if (!currentWish) return;
    const text = `${life.name} (${cName}) - ${currentWish.title}\n“${currentWish.dream}”\n1in8bn.com`;
    try {
      if (navigator.share) {
        await navigator.share({ title: currentWish.title, text, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(text);
        alert(t('copied'));
      }
    } catch {}
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="unfulfilled-wishes-modal" id="gwScene">
        <div className="modal-header">
          <div className="gw-head-info">
            <Sparkles size={20} className="accent" />
            <div>
              <h3>{t('ui.unfulfilledWishesTitle')}</h3>
              <p className="cm-sub">{t('ui.unfulfilledWishesDesc')}</p>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label={t('close')}>
            <X size={18} />
          </button>
        </div>

        {/* Tab pills for each wish */}
        <div className="gw-tab-row">
          {wishes.map((wish, idx) => (
            <button
              key={wish.id}
              type="button"
              className={`gw-tab-btn ${idx === selectedIndex ? 'active' : ''}`}
              onClick={() => setSelectedIndex(idx)}
            >
              <span>{wish.icon}</span>
              <span>{wish.title}</span>
            </button>
          ))}
        </div>

        {currentWish && (
          <div className="gw-card-body">
            <div className="gw-postcard">
              <div className="gw-post-header">
                <span className="gw-post-badge">
                  {currentWish.icon} {currentWish.title}
                </span>
                <span className="gw-post-stamp">{life.country.flag}</span>
              </div>

              <div className="gw-regret-box">
                <span className="gw-section-label">{t('ui.wishRegretLabel')}</span>
                <p className="gw-regret-text">“{currentWish.regret}”</p>
              </div>

              <div className="gw-dream-box">
                <span className="gw-section-label highlight">{t('ui.wishDreamLabel')}</span>
                <p className="gw-dream-text">“{currentWish.dream}”</p>
              </div>

              <p className="gw-quote">{currentWish.quote}</p>
            </div>

            <div className="gw-actions">
              <button type="button" className="ghost sm" id="gwPic" onClick={handleSaveCard}>
                <Camera size={14} />
                <span>{t('ui.wishSaveCard')}</span>
              </button>
              <button type="button" className="ghost sm" id="gwShare" onClick={handleShare}>
                <Share2 size={14} />
                <span>{t('feature.shareFriends')}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  let curY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, curY);
      line = words[n] + ' ';
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, curY);
}
