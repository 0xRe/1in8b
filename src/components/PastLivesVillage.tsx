import { useState,useRef,useMemo } from 'react';
import type { Life } from '../game/types';
import type { Locale, translator } from '../lib/i18n';
import { countryName } from '../game/countries';
import { Camera, Home, X, Users, ArrowLeft, Check } from 'lucide-react';

interface Props {
  past: Life[];
  locale: Locale;
  t: ReturnType<typeof translator>;
  onOpenLife: (life: Life) => void;
  onClose?: () => void;
}

const NATIVE_GREETINGS: Record<string, string> = {
  CN: '你好！',
  TW: '你好！',
  HK: '早晨！',
  JP: 'こんにちは！',
  KR: '안녕하세요!',
  VN: 'Xin chào!',
  FR: 'Bonjour !',
  TH: 'สวัสดีครับ/ค่ะ!',
  ES: '¡Hola!',
  MX: '¡Hola amigo!',
  DE: 'Guten Tag!',
  TR: 'Merhaba!',
  RU: 'Здравствуйте!',
  BR: 'Olá!',
  PT: 'Olá!',
  ID: 'Halo!',
  IT: 'Ciao!',
  SA: 'السلام عليكم!',
  EG: 'أهلاً وسهلاً!',
  IN: 'नमस्ते!',
  NG: 'Kedu / Bawo!',
  KE: 'Habari!',
  ZA: 'Sawubona!',
  GB: 'Hello there!',
  US: 'Hey there!',
};

const COZY_THOUGHTS = [
  'Remembering the morning sun warming the kitchen table.',
  'Missing the fragrant aroma of home-cooked meals.',
  'Glad we walked this world and left gentle memories.',
  'The sound of rain against the window with those I loved.',
  'A life of honest work and peaceful evenings.',
  'Thinking of my children and the trees we planted.',
  'Every season brought its own quiet beauty.',
  'Grateful for every friend who greeted me by name.',
];

export function PastLivesVillage({ past, locale, t, onOpenLife, onClose }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(past[0]?.id || null);
  const [pickMode, setPickMode] = useState(false);

  const [chosenIds, setChosenIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('one8b.vlgPick');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch {}
    return past.slice(0, 12).map((l) => l.id);
  });

  const [tempPickIds, setTempPickIds] = useState<string[]>(chosenIds);

  const villageRef = useRef<HTMLDivElement>(null);

  const lives = useMemo(() => {
    if (!chosenIds.length) return past.slice(0, 12);
    const idSet = new Set(chosenIds);
    const filtered = past.filter((l) => idSet.has(l.id));
    return filtered.length ? filtered.slice(0, 12) : past.slice(0, 12);
  }, [past, chosenIds]);

  const handleOpenPicker = () => {
    setTempPickIds(chosenIds.length ? chosenIds : past.slice(0, 12).map((l) => l.id));
    setPickMode(true);
  };

  const handleToggleLife = (id: string) => {
    if (tempPickIds.includes(id)) {
      setTempPickIds(tempPickIds.filter((item) => item !== id));
    } else {
      if (tempPickIds.length < 12) {
        setTempPickIds([...tempPickIds, id]);
      }
    }
  };

  const handleResetNewest = () => {
    const newest = past.slice(0, 12).map((l) => l.id);
    setTempPickIds(newest);
  };

  const handleConfirmPicks = () => {
    const finalIds = tempPickIds.length ? tempPickIds : past.slice(0, 12).map((l) => l.id);
    setChosenIds(finalIds);
    try {
      localStorage.setItem('one8b.vlgPick', JSON.stringify(finalIds));
    } catch {}
    setPickMode(false);
  };

  const takeVillagePhoto = () => {
    if (!villageRef.current) return;
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = 800;
      canvas.height = 480;

      // Gradient background
      const grad = ctx.createLinearGradient(0, 0, 0, 480);
      grad.addColorStop(0, '#f8fafc');
      grad.addColorStop(1, '#e2e8f0');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 800, 480);

      // Title
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText(t('ui.villageTitle'), 30, 45);

      ctx.fillStyle = '#64748b';
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText(`${lives.length} lives living as neighbours · 1in8bn.com`, 30, 72);

      // Render cards
      const cols = Math.min(4, Math.max(2, Math.ceil(lives.length / 2)));
      const cardW = 165;
      const cardH = 150;
      const startX = 30;
      const startY = 95;

      lives.forEach((l, idx) => {
        const r = Math.floor(idx / cols);
        const c = idx % cols;
        const x = startX + c * (cardW + 18);
        const y = startY + r * (cardH + 20);

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x, y, cardW, cardH, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 15px system-ui, sans-serif';
        ctx.fillText(`${l.country.flag} ${l.name}`, x + 12, y + 28);

        ctx.fillStyle = '#475569';
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillText(countryName(l.country, locale), x + 12, y + 48);
        ctx.fillText(`${l.birthYear} – ${l.year} (age ${l.age})`, x + 12, y + 68);

        ctx.fillStyle = '#0284c7';
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillText(t(`job.${l.stats.job}`), x + 12, y + 90);
      });

      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `village-of-past-lives.png`;
      a.click();
    } catch {}
  };

  const selectedLife = lives.find((l) => l.id === selectedId) || lives[0];

  return (
    <div className="vlg-box" id="vlgBox" ref={villageRef}>
      {pickMode ? (
        <div className="vlg-pkw">
          <div className="vlg-header">
            <div>
              <h3>{t('ui.villagePick')}</h3>
              <p className="cm-sub">{t('ui.villagePickLimit')}</p>
            </div>
            <button type="button" className="icon-button" onClick={() => setPickMode(false)}>
              <ArrowLeft size={18} />
            </button>
          </div>

          <div className="vlg-pkl">
            {past.map((life) => {
              const isSelected = tempPickIds.includes(life.id);
              return (
                <button
                  key={life.id}
                  type="button"
                  className={`vlg-pk ${isSelected ? 'on' : ''}`}
                  onClick={() => handleToggleLife(life.id)}
                  aria-pressed={isSelected}
                >
                  <span className="vlg-pk-f">{life.country.flag}</span>
                  <div className="vlg-pk-t">
                    <b>{life.name}</b>
                    <small>
                      {countryName(life.country, locale)} · † {life.age} · {t(`job.${life.stats.job}`)}
                    </small>
                  </div>
                  <span className="vlg-pk-c">{isSelected && <Check size={16} />}</span>
                </button>
              );
            })}
          </div>

          <div className="vlg-pk-bar">
            <span className="vlg-pk-n" id="vlgPkN">
              {tempPickIds.length} / 12
            </span>
            <button type="button" className="ghost sm" id="vlgPkNew" onClick={handleResetNewest}>
              {t('ui.villagePickNewest')}
            </button>
            <button type="button" className="cta sm" id="vlgPkOk" onClick={handleConfirmPicks}>
              {t('ui.villagePickConfirm')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="vlg-header">
            <div>
              <p className="vlg-desc">{t('ui.villageDesc')}</p>
            </div>
            <div className="vlg-head-actions">
              {past.length > 0 && (
                <button
                  type="button"
                  className="ghost sm"
                  id="vlgPick"
                  onClick={handleOpenPicker}
                  title={t('ui.villagePick')}
                >
                  <Users size={14} />
                  <span>{t('ui.villagePick')}</span>
                </button>
              )}
              {lives.length > 0 && (
                <button
                  type="button"
                  className="ghost sm"
                  id="vlgPic"
                  onClick={takeVillagePhoto}
                  title={t('ui.villagePhoto')}
                >
                  <Camera size={14} />
                  <span>{t('ui.villagePhoto')}</span>
                </button>
              )}
              {onClose && (
                <button type="button" className="icon-button" onClick={onClose} aria-label={t('close')}>
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {lives.length === 0 ? (
            <div className="vlg-empty">
              <Home size={36} className="muted" />
              <p>{t('ui.villageEmpty')}</p>
            </div>
          ) : (
            <>
              <div className="vlg-grid">
                {lives.map((life, idx) => {
                  const isSelected = selectedLife?.id === life.id;
                  const greeting =
                    NATIVE_GREETINGS[life.country.id] ||
                    (locale === 'zh-hans' || locale === 'zh' ? '你好！' : 'Hello!');
                  const thought = COZY_THOUGHTS[idx % COZY_THOUGHTS.length];

                  return (
                    <div
                      key={life.id}
                      className={`vlg-card ${isSelected ? 'active' : ''}`}
                      id={isSelected ? 'vlgCard' : undefined}
                      onClick={() => setSelectedId(life.id)}
                    >
                      <div className="vlg-card-roof">
                        <span className="vlg-flag">{life.country.flag}</span>
                        <span className="vlg-country">{countryName(life.country, locale)}</span>
                      </div>
                      <div className="vlg-card-body">
                        <strong className="vlg-name">{life.name}</strong>
                        <span className="vlg-dates">
                          {life.birthYear} – {life.year} · † {life.age}
                        </span>
                        <span className="vlg-role">{t(`job.${life.stats.job}`)}</span>
                        <div className="vlg-bubble">
                          <span className="vlg-greeting">{greeting}</span>
                          <p className="vlg-thought">{thought}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="vlg-open-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenLife(life);
                        }}
                      >
                        {t('record')} »
                      </button>
                    </div>
                  );
                })}
              </div>

              {selectedLife && (
                <div className="vlg-footer-bar">
                  <span>
                    <b>{selectedLife.name}</b> · {countryName(selectedLife.country, locale)} (
                    {selectedLife.birthYear} – {selectedLife.year})
                  </span>
                  <button
                    type="button"
                    className="primary sm"
                    onClick={() => onOpenLife(selectedLife)}
                  >
                    {t('record')}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
