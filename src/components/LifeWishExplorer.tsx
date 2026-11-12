import { useState, useMemo } from 'react';
import type { Life } from '../game/types';
import type { Locale, translator } from '../lib/i18n';
import { countryName } from '../game/countries';
import {
  extractMomentsFromLives,
  buildWishQuestions,
  calculateWishResult,
  WISH_ARCHETYPES,
  POLE_NAMES,
  type WishQuestion,
  type WishResult,
  type WishPole,
} from '../lib/life-wish';
import { Camera,RotateCcw,ArrowLeft,Compass,Sparkles } from 'lucide-react';

interface Props {
  past: Life[];
  locale: Locale;
  t: ReturnType<typeof translator>;
  onClose?: () => void;
  onOpenLife?: (life: Life) => void;
}

export function LifeWishExplorer({ past, locale, t, onClose }: Props) {
  const [step, setStep] = useState<'intro' | 'quiz' | 'result'>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<WishPole[]>([]);
  const [result, setResult] = useState<WishResult | null>(null);

  const momentsByPole = useMemo(() => extractMomentsFromLives(past, locale, t), [past, locale, t]);
  const [questions, setQuestions] = useState<WishQuestion[]>([]);

  const handleStart = () => {
    const qList = buildWishQuestions(momentsByPole);
    setQuestions(qList);
    setCurrentIndex(0);
    setAnswers([]);
    setResult(null);
    setStep('quiz');
  };

  const handlePick = (pole: WishPole) => {
    const nextAnswers = [...answers, pole];
    setAnswers(nextAnswers);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      const res = calculateWishResult(nextAnswers, past);
      setResult(res);
      setStep('result');
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setAnswers(answers.slice(0, -1));
    } else {
      setStep('intro');
    }
  };

  const getArchetypeTitle = (code: string) => {
    const entry = WISH_ARCHETYPES[code];
    if (!entry) return code;
    if (locale === 'ko') return entry.ko;
    if (locale === 'zh' || locale === 'zh-hans') return entry.zh;
    if (locale === 'ja') return entry.ja;
    if (locale === 'fr') return entry.fr;
    if (locale === 'de') return entry.de;
    if (locale === 'es') return entry.es;
    return entry.en;
  };

  const getPoleLabel = (pole: WishPole) => {
    const entry = POLE_NAMES[pole];
    if (!entry) return pole;
    if (locale === 'ko') return entry.ko;
    if (locale === 'zh' || locale === 'zh-hans') return entry.zh;
    if (locale === 'ja') return entry.ja;
    if (locale === 'fr') return entry.fr;
    if (locale === 'de') return entry.de;
    if (locale === 'es') return entry.es;
    return entry.en;
  };

  const handleSavePicture = () => {
    if (!result) return;
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 640;
      canvas.height = 720;

      // Warm gradient background
      const grad = ctx.createLinearGradient(0, 0, 0, 720);
      grad.addColorStop(0, '#fef9f5');
      grad.addColorStop(1, '#f3e8de');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 720);

      // Card border
      ctx.strokeStyle = '#d6c4b2';
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 20, 600, 680);

      // Subtitle
      ctx.fillStyle = '#8c735f';
      ctx.font = '14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t('ui.wishTitle') + ' · 1in8bn.com', 320, 70);

      // Archetype Title
      ctx.fillStyle = '#2d1810';
      ctx.font = 'bold 30px system-ui, sans-serif';
      ctx.fillText(getArchetypeTitle(result.code), 320, 120);

      // Archetype Code badge
      ctx.fillStyle = '#8c735f';
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText(`[ ${result.code.toUpperCase()} ]`, 320, 150);

      // Divider
      ctx.strokeStyle = '#e6d7c8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(80, 175);
      ctx.lineTo(560, 175);
      ctx.stroke();

      // Axis breakdowns
      const axes = ['pw', 'rf', 'cv', 'tm'] as const;
      let yPos = 220;

      axes.forEach((ax) => {
        const item = result.percentages[ax];
        const nameA = getPoleLabel(item.poleA);
        const nameB = getPoleLabel(item.poleB);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#4a3728';
        ctx.font = '14px system-ui, sans-serif';
        ctx.fillText(`${nameA} (${item.pctA}%)`, 60, yPos);

        ctx.textAlign = 'right';
        ctx.fillText(`${item.pctB}% (${nameB})`, 580, yPos);

        // Progress bar background
        ctx.fillStyle = '#e5d7ca';
        ctx.fillRect(60, yPos + 10, 520, 10);

        // Progress bar fill
        ctx.fillStyle = '#b45309';
        ctx.fillRect(60, yPos + 10, (520 * item.pctA) / 100, 10);

        yPos += 75;
      });

      // Bottom reflection quote
      ctx.textAlign = 'center';
      ctx.fillStyle = '#785b46';
      ctx.font = 'italic 15px system-ui, sans-serif';
      ctx.fillText('“A life lived with heart leaves gentle traces across the earth.”', 320, 580);

      // Footer
      ctx.fillStyle = '#a89484';
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(`Drawn from ${past.length} past lives · 100% Free · 1in8bn.com`, 320, 640);

      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `the-life-i-wish-for-${result.code}.png`;
      a.click();
    } catch {}
  };

  const currentQ = questions[currentIndex];

  return (
    <div className="wsh-w" id="wshW">
      {step === 'intro' && (
        <div className="wsh-intro-box">
          <div className="wsh-hero-badge">
            <Compass size={28} className="wsh-icon-hero" />
            <h3>{t('ui.wishTitle')}</h3>
          </div>
          <p className="cm-sub">{t('ui.wishDesc')}</p>

          {past.length > 0 && (
            <div className="pl-shelf-row wsh-row">
              {past.slice(0, 8).map((life) => (
                <div key={life.id} className="wsh-past-pill" title={`${life.name} (${countryName(life.country, locale)})`}>
                  <span className="wsh-pill-flag">{life.country.flag}</span>
                  <span className="wsh-pill-name">{life.name}</span>
                </div>
              ))}
            </div>
          )}

          <p className="wsh-rounds-note">{t('ui.wishRoundsHint')}</p>

          <div className="kp-row">
            <button type="button" className="cta" id="wshGo" onClick={handleStart}>
              {t('ui.wishStart')}
            </button>
          </div>

          <p className="pl-hint">{t('unlived.privacyNote')}</p>
        </div>
      )}

      {step === 'quiz' && currentQ && (
        <div className="wsh-quiz-box">
          <div className="wsh-quiz-bar">
            <button type="button" className="ghost sm" id="wshBack" onClick={handleBack}>
              <ArrowLeft size={14} />
              <span>{t('back')}</span>
            </button>
            <span className="wsh-step-num">
              {currentIndex + 1} / {questions.length}
            </span>
          </div>

          <div className="wsh-cards-choice">
            {currentQ.options.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                className="wsh-c"
                onClick={() => handlePick(opt.pole)}
              >
                <div className="wsh-c-inner">
                  {opt.flag && (
                    <div className="wsh-who">
                      <span>{opt.flag}</span>
                      <span>{opt.name}</span>
                      {opt.age !== undefined && <small>· † {opt.age}</small>}
                    </div>
                  )}
                  <p className="wsh-t">{opt.text}</p>
                  <span className="wsh-pole-tag">{getPoleLabel(opt.pole)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'result' && result && (
        <div className="wsh-res-box" id="wshRes">
          <div className="wsh-res-header">
            <Sparkles size={24} className="accent" />
            <span className="wsh-res-eyebrow">{t('ui.wishTitle')}</span>
            <h2 className="wsh-res-title">{getArchetypeTitle(result.code)}</h2>
            <span className="wsh-code-badge">[{result.code.toUpperCase()}]</span>
          </div>

          <div className="wsh-axes-summary">
            {(['pw', 'rf', 'cv', 'tm'] as const).map((ax) => {
              const item = result.percentages[ax];
              const labelA = getPoleLabel(item.poleA);
              const labelB = getPoleLabel(item.poleB);

              return (
                <div key={ax} className="wsh-axis-row">
                  <div className="wsh-axis-labels">
                    <span className="wsh-axis-side-a">
                      {labelA} <b>{item.pctA}%</b>
                    </span>
                    <span className="wsh-axis-side-b">
                      <b>{item.pctB}%</b> {labelB}
                    </span>
                  </div>
                  <div className="wsh-bar-track">
                    <div className="wsh-bar-fill" style={{ width: `${item.pctA}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="wsh-res-actions">
            <button type="button" className="ghost sm" id="wshPic" onClick={handleSavePicture}>
              <Camera size={14} />
              <span>{t('ui.wishSaveImage')}</span>
            </button>
            <button type="button" className="ghost sm" id="wshAgain" onClick={handleStart}>
              <RotateCcw size={14} />
              <span>{t('ui.wishTryAgain')}</span>
            </button>
            {onClose && (
              <button type="button" className="primary sm" onClick={onClose}>
                {t('close')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
